from __future__ import annotations

import base64
import hashlib
import hmac
import uuid
from datetime import datetime, timezone
from typing import Any

import httpx

from phishintel.config import Settings
from phishintel.httputil import retry
from phishintel.intel.unwrap import is_mimecast_rewritten
from phishintel.models import ExtractedUrl, IntelResult, ParsedEmail


class MimecastClient:
    def __init__(self, settings: Settings, client: httpx.Client | None = None) -> None:
        self.settings = settings
        self._client = client or httpx.Client(timeout=settings.http_timeout_seconds)
        self._owns_client = client is None
        self._token: str | None = None

    def close(self) -> None:
        if self._owns_client:
            self._client.close()

    def enabled(self) -> bool:
        return self.settings.mimecast_enabled()

    def decode_url(self, url: str) -> tuple[str | None, dict[str, Any]]:
        if not self.enabled():
            return None, {"skipped": "mimecast-not-configured"}
        payload = {"data": [{"url": url}]}
        data = self._post("/api/ttp/url/decode-url", payload)
        items = (data or {}).get("data") or []
        if not items:
            fail = ((data or {}).get("fail") or [{}])[0]
            return None, {"error": fail or data}
        item = items[0]
        decoded = item.get("url")
        success = item.get("success", bool(decoded))
        if not success:
            return None, item
        return decoded, item

    def search_message(self, message_id: str) -> dict[str, Any] | None:
        if not self.enabled() or not message_id:
            return None
        payload = {
            "data": [
                {
                    "advancedTrackAndTraceOptions": {
                        "messageId": message_id.strip()
                    }
                }
            ]
        }
        data = self._post("/api/message-finder/search", payload)
        items = (data or {}).get("data") or []
        if not items:
            return data
        first = items[0]
        tracked = first.get("trackedEmails") or first.get("messages") or items
        if isinstance(tracked, list) and tracked:
            info_id = tracked[0].get("id") or tracked[0].get("messageId")
            if info_id:
                info = self._post(
                    "/api/message-finder/get-message-info",
                    {"data": [{"id": info_id}]},
                )
                return {"search": first, "info": info}
        return first

    def _post(self, uri: str, payload: dict[str, Any]) -> dict[str, Any]:
        def call() -> dict[str, Any]:
            if self.settings.mimecast_oauth_enabled():
                headers = {
                    "Authorization": f"Bearer {self._oauth_token()}",
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                }
                url = self.settings.mimecast_base_url.rstrip("/") + uri
            else:
                headers = self._hmac_headers(uri)
                url = self.settings.mimecast_api1_base_url.rstrip("/") + uri
            response = self._client.post(url, headers=headers, json=payload)
            if response.status_code == 401 and self.settings.mimecast_oauth_enabled():
                self._token = None
            response.raise_for_status()
            return response.json()

        return retry(call)

    def _oauth_token(self) -> str:
        if self._token:
            return self._token

        def call() -> str:
            response = self._client.post(
                self.settings.mimecast_base_url.rstrip("/") + "/oauth/token",
                data={
                    "client_id": self.settings.mimecast_client_id,
                    "client_secret": self.settings.mimecast_client_secret,
                    "grant_type": "client_credentials",
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            response.raise_for_status()
            token = response.json().get("access_token")
            if not token:
                raise RuntimeError("Mimecast OAuth response missing access_token")
            return token

        self._token = retry(call)
        return self._token

    def _hmac_headers(self, uri: str) -> dict[str, str]:
        request_id = str(uuid.uuid4())
        hdr_date = datetime.now(timezone.utc).strftime("%a, %d %b %Y %H:%M:%S UTC")
        data_to_sign = ":".join(
            [hdr_date, request_id, uri, self.settings.mimecast_app_key]
        )
        secret = base64.b64decode(self.settings.mimecast_secret_key)
        digest = hmac.new(secret, data_to_sign.encode("utf-8"), hashlib.sha1).digest()
        signature = base64.b64encode(digest).decode("ascii")
        return {
            "Authorization": f"MC {self.settings.mimecast_access_key}:{signature}",
            "x-mc-app-id": self.settings.mimecast_app_id,
            "x-mc-date": hdr_date,
            "x-mc-req-id": request_id,
            "Content-Type": "application/json",
            "Accept": "application/json",
        }


class MimecastAgent:
    name = "mimecast"

    def __init__(self, client: MimecastClient) -> None:
        self.client = client

    def decode_urls(self, urls: list[ExtractedUrl], errors: list[str]) -> list[ExtractedUrl]:
        for url in urls:
            if url.rewriter != "mimecast" and not is_mimecast_rewritten(url.original):
                continue
            if not self.client.enabled():
                errors.append(
                    "Mimecast rewritten URL found but Mimecast API is not configured"
                )
                break
            try:
                decoded, raw = self.client.decode_url(url.original)
            except Exception as exc:  # noqa: BLE001
                errors.append(f"Mimecast decode failed for {url.original}: {exc}")
                continue
            if decoded:
                url.decoded = decoded
                url.final = decoded
                url.decode_source = "mimecast-api"
                host = httpx.URL(decoded).host or url.domain
                url.domain = (host or "").lower()
            else:
                errors.append(f"Mimecast decode returned no URL for {url.original}: {raw}")
        return urls

    def message_intel(self, parsed: ParsedEmail, errors: list[str]) -> IntelResult | None:
        if not self.client.enabled() or not self.client.settings.mimecast_lookup_message:
            return None
        target = parsed.nested or parsed
        if not target.message_id:
            return None
        try:
            data = self.client.search_message(target.message_id)
        except Exception as exc:  # noqa: BLE001
            errors.append(f"Mimecast message search failed: {exc}")
            return None
        if not data:
            return None
        summary = "Mimecast message-finder lookup completed"
        info = data.get("info") if isinstance(data, dict) else None
        detections = []
        if isinstance(info, dict):
            detections = (
                info.get("data")
                or info.get("reason")
                or info.get("status")
                or []
            )
            summary = str(detections)[:300]
        return IntelResult(
            provider="mimecast",
            target=target.message_id,
            target_type="message-id",
            verdict="info",
            summary=summary,
            extra=data if isinstance(data, dict) else {"raw": data},
        )
