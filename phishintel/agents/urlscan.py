from __future__ import annotations

import time
from typing import Any
import httpx

from phishintel.config import Settings
from phishintel.httputil import retry
from phishintel.intel.unwrap import is_internal_target
from phishintel.models import ExtractedUrl, IntelResult

URLSCAN_BASE = "https://urlscan.io/api/v1"


class UrlscanClient:
    def __init__(self, settings: Settings, client: httpx.Client | None = None) -> None:
        self.settings = settings
        self._client = client or httpx.Client(timeout=settings.http_timeout_seconds)
        self._owns_client = client is None

    def close(self) -> None:
        if self._owns_client:
            self._client.close()

    def enabled(self) -> bool:
        return bool(self.settings.urlscan_api_key)

    def _headers(self) -> dict[str, str]:
        return {
            "API-Key": self.settings.urlscan_api_key,
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    def search(self, url: str) -> dict[str, Any] | None:
        query = f'page.url:"{url}" OR task.url:"{url}"'

        def call() -> dict[str, Any]:
            response = self._client.get(
                f"{URLSCAN_BASE}/search/",
                params={"q": query, "size": 1},
                headers=self._headers(),
            )
            response.raise_for_status()
            return response.json()

        data = retry(call)
        results = data.get("results") or []
        return results[0] if results else None

    def submit(self, url: str) -> dict[str, Any]:
        def call() -> dict[str, Any]:
            response = self._client.post(
                f"{URLSCAN_BASE}/scan/",
                headers=self._headers(),
                json={
                    "url": url,
                    "visibility": self.settings.urlscan_visibility,
                    "tags": ["phishintel", "jira-report"],
                },
            )
            response.raise_for_status()
            return response.json()

        return retry(call)

    def result(self, uuid: str) -> dict[str, Any] | None:
        def call() -> dict[str, Any] | None:
            response = self._client.get(
                f"{URLSCAN_BASE}/result/{uuid}/",
                headers=self._headers(),
            )
            if response.status_code == 404:
                return None
            response.raise_for_status()
            return response.json()

        return retry(call)

    def wait_for_result(self, uuid: str) -> dict[str, Any] | None:
        deadline = time.time() + self.settings.urlscan_poll_timeout_seconds
        time.sleep(8)
        while time.time() < deadline:
            payload = self.result(uuid)
            if payload:
                return payload
            time.sleep(3)
        return None


def _verdict_from_urlscan(payload: dict[str, Any]) -> tuple[str, str, str | None]:
    uuid = payload.get("_id") or payload.get("task", {}).get("uuid") or ""
    permalink = payload.get("result") or (f"https://urlscan.io/result/{uuid}/" if uuid else None)
    verdicts = (payload.get("verdicts") or {}).get("overall") or {}
    if payload.get("page") and "verdicts" in payload:
        overall = payload["verdicts"].get("overall") or {}
        malicious = bool(overall.get("malicious"))
        score = overall.get("score") or 0
        categories = ",".join(overall.get("categories") or []) or "none"
        verdict = "malicious" if malicious else ("suspicious" if score >= 50 else "harmless")
        return verdict, f"urlscan {verdict} score={score} categories={categories}", permalink
    # Search hit shape
    if "verdicts" in payload:
        overall = payload.get("verdicts") or {}
        malicious = bool(overall.get("malicious"))
        verdict = "malicious" if malicious else "info"
        return verdict, f"urlscan search hit ({verdict})", permalink
    return "info", "urlscan result available", permalink


class UrlscanAgent:
    name = "urlscan"

    def __init__(self, client: UrlscanClient) -> None:
        self.client = client

    def enrich(self, urls: list[ExtractedUrl], errors: list[str]) -> list[IntelResult]:
        if not self.client.enabled():
            return []
        results: list[IntelResult] = []
        seen: set[str] = set()
        for url in urls:
            target = url.final or url.original
            if target in seen or is_internal_target(target):
                continue
            seen.add(target)
            try:
                hit = self.client.search(target)
                payload: dict[str, Any] | None = None
                if hit:
                    uuid = hit.get("_id")
                    if uuid:
                        payload = self.client.result(uuid) or hit
                    else:
                        payload = hit
                elif self.client.settings.urlscan_submit:
                    submitted = self.client.submit(target)
                    uuid = submitted.get("uuid")
                    payload = self.client.wait_for_result(uuid) if uuid else submitted
                    if payload is None and uuid:
                        payload = {
                            "task": {"uuid": uuid},
                            "result": submitted.get("result"),
                            "message": "scan submitted; result not ready before timeout",
                        }
                if not payload:
                    continue
                verdict, summary, permalink = _verdict_from_urlscan(payload)
                page = payload.get("page") or hit.get("page") if hit else {}
                results.append(
                    IntelResult(
                        provider="urlscan",
                        target=target,
                        target_type="url",
                        verdict=verdict,
                        malicious=1 if verdict == "malicious" else 0,
                        suspicious=1 if verdict == "suspicious" else 0,
                        permalink=permalink or payload.get("result"),
                        summary=summary,
                        extra={
                            "page_domain": (page or {}).get("domain"),
                            "page_ip": (page or {}).get("ip"),
                            "page_title": (page or {}).get("title"),
                            "screenshot": payload.get("task", {}).get("screenshotURL")
                            or (f"https://urlscan.io/screenshots/{payload.get('task', {}).get('uuid')}.png"
                                if payload.get("task", {}).get("uuid")
                                else None),
                        },
                    )
                )
            except Exception as exc:  # noqa: BLE001
                errors.append(f"urlscan lookup failed for {target}: {exc}")
        return results
