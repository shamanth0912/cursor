from __future__ import annotations

import base64
import time
from typing import Any
from urllib.parse import urlparse

import httpx

from phishintel.config import Settings
from phishintel.httputil import retry
from phishintel.intel.unwrap import is_internal_target
from phishintel.models import AttachmentInfo, ExtractedUrl, IntelResult, SenderAnalysis

VT_BASE = "https://www.virustotal.com/api/v3"


def url_id(url: str) -> str:
    return base64.urlsafe_b64encode(url.encode("utf-8")).decode("ascii").rstrip("=")


class VirusTotalClient:
    def __init__(self, settings: Settings, client: httpx.Client | None = None) -> None:
        self.settings = settings
        self._client = client or httpx.Client(timeout=settings.http_timeout_seconds)
        self._owns_client = client is None

    def close(self) -> None:
        if self._owns_client:
            self._client.close()

    def enabled(self) -> bool:
        return bool(self.settings.virustotal_api_key)

    def _headers(self) -> dict[str, str]:
        return {"x-apikey": self.settings.virustotal_api_key, "Accept": "application/json"}

    def get_url(self, url: str) -> dict[str, Any] | None:
        return self._get(f"/urls/{url_id(url)}")

    def submit_url(self, url: str) -> dict[str, Any]:
        def call() -> dict[str, Any]:
            response = self._client.post(
                VT_BASE + "/urls",
                headers=self._headers(),
                data={"url": url},
            )
            response.raise_for_status()
            return response.json()

        return retry(call)

    def get_domain(self, domain: str) -> dict[str, Any] | None:
        return self._get(f"/domains/{domain}")

    def get_ip(self, ip: str) -> dict[str, Any] | None:
        return self._get(f"/ip_addresses/{ip}")

    def get_file(self, file_hash: str) -> dict[str, Any] | None:
        return self._get(f"/files/{file_hash}")

    def _get(self, path: str) -> dict[str, Any] | None:
        def call() -> dict[str, Any] | None:
            response = self._client.get(VT_BASE + path, headers=self._headers())
            if response.status_code == 404:
                return None
            response.raise_for_status()
            return response.json()

        return retry(call)


def _stats_verdict(stats: dict[str, Any]) -> tuple[str, int, int, int, int]:
    malicious = int(stats.get("malicious") or 0)
    suspicious = int(stats.get("suspicious") or 0)
    harmless = int(stats.get("harmless") or 0)
    undetected = int(stats.get("undetected") or 0)
    if malicious >= 3:
        verdict = "malicious"
    elif malicious >= 1 or suspicious >= 2:
        verdict = "suspicious"
    elif harmless > 0 and malicious == 0:
        verdict = "harmless"
    else:
        verdict = "undetected"
    return verdict, malicious, suspicious, harmless, undetected


def _from_object(provider_target: str, target_type: str, payload: dict[str, Any]) -> IntelResult:
    data = payload.get("data") or {}
    attrs = data.get("attributes") or {}
    stats = attrs.get("last_analysis_stats") or {}
    verdict, malicious, suspicious, harmless, undetected = _stats_verdict(stats)
    obj_id = data.get("id") or provider_target
    permalink = f"https://www.virustotal.com/gui/{target_type}/{obj_id}"
    if target_type == "url":
        permalink = f"https://www.virustotal.com/gui/url/{obj_id}"
    elif target_type == "domain":
        permalink = f"https://www.virustotal.com/gui/domain/{provider_target}"
    elif target_type == "ip-address":
        permalink = f"https://www.virustotal.com/gui/ip-address/{provider_target}"
    elif target_type == "file":
        permalink = f"https://www.virustotal.com/gui/file/{provider_target}"
    return IntelResult(
        provider="virustotal",
        target=provider_target,
        target_type=target_type,
        verdict=verdict,
        malicious=malicious,
        suspicious=suspicious,
        harmless=harmless,
        undetected=undetected,
        permalink=permalink,
        summary=f"VT {verdict}: {malicious} malicious / {suspicious} suspicious",
        extra={"reputation": attrs.get("reputation"), "tags": attrs.get("tags") or []},
    )


class VirusTotalAgent:
    name = "virustotal"

    def __init__(self, client: VirusTotalClient) -> None:
        self.client = client

    def enrich(
        self,
        urls: list[ExtractedUrl],
        sender: SenderAnalysis,
        attachments: list[AttachmentInfo],
        errors: list[str],
    ) -> list[IntelResult]:
        if not self.client.enabled():
            return []
        results: list[IntelResult] = []
        seen_domains: set[str] = set()
        for url in urls:
            target = url.final or url.original
            if is_internal_target(target):
                continue
            try:
                payload = self.client.get_url(target)
                if payload is None and self.client.settings.virustotal_submit_unknown:
                    self.client.submit_url(target)
                    time.sleep(3)
                    payload = self.client.get_url(target)
                if payload:
                    results.append(_from_object(target, "url", payload))
            except Exception as exc:  # noqa: BLE001
                errors.append(f"VirusTotal URL lookup failed for {target}: {exc}")
            domain = url.domain or (urlparse(target).hostname or "")
            domain = domain.lower()
            if domain and domain not in seen_domains and not is_internal_target(f"https://{domain}"):
                seen_domains.add(domain)
                try:
                    payload = self.client.get_domain(domain)
                    if payload:
                        results.append(_from_object(domain, "domain", payload))
                except Exception as exc:  # noqa: BLE001
                    errors.append(f"VirusTotal domain lookup failed for {domain}: {exc}")

        if sender.originating_ip:
            try:
                payload = self.client.get_ip(sender.originating_ip)
                if payload:
                    results.append(_from_object(sender.originating_ip, "ip-address", payload))
            except Exception as exc:  # noqa: BLE001
                errors.append(f"VirusTotal IP lookup failed: {exc}")

        from_domain = sender.from_addr.domain
        if from_domain and from_domain not in seen_domains:
            try:
                payload = self.client.get_domain(from_domain)
                if payload:
                    results.append(_from_object(from_domain, "domain", payload))
            except Exception as rec:  # noqa: BLE001
                errors.append(f"VirusTotal sender domain lookup failed: {rec}")

        for attachment in attachments:
            if not attachment.sha256:
                continue
            try:
                payload = self.client.get_file(attachment.sha256)
                if payload:
                    results.append(_from_object(attachment.sha256, "file", payload))
            except Exception as exc:  # noqa: BLE001
                errors.append(f"VirusTotal file lookup failed for {attachment.filename}: {exc}")
        return results
