from __future__ import annotations

import base64
from typing import Any
from urllib.parse import urljoin

import httpx

from phishintel.config import Settings
from phishintel.httputil import retry
from phishintel.models import AnalysisReport
from phishintel.reporting.jira_comment import wiki_comment

EML_SUFFIXES = (".eml", ".eml.txt")
EML_TYPES = {"message/rfc822", "application/octet-stream", "text/plain"}


class JiraClient:
    def __init__(self, settings: Settings, client: httpx.Client | None = None) -> None:
        self.settings = settings
        self._client = client or httpx.Client(timeout=settings.http_timeout_seconds)
        self._owns_client = client is None

    def close(self) -> None:
        if self._owns_client:
            self._client.close()

    def enabled(self) -> bool:
        return self.settings.jira_enabled()

    def _auth_header(self) -> str:
        token = f"{self.settings.jira_email}:{self.settings.jira_api_token}"
        encoded = base64.b64encode(token.encode()).decode("ascii")
        return f"Basic {encoded}"

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": self._auth_header(),
            "Accept": "application/json",
            "Content-Type": "application/json",
        }

    def _url(self, path: str) -> str:
        return urljoin(self.settings.jira_base_url.rstrip("/") + "/", path.lstrip("/"))

    def get_issue(self, key: str) -> dict[str, Any]:
        def call() -> dict[str, Any]:
            response = self._client.get(
                self._url(f"/rest/api/2/issue/{key}"),
                headers=self._headers(),
                params={"fields": "summary,description,attachment,labels,comment,status,reporter"},
            )
            response.raise_for_status()
            return response.json()

        return retry(call)

    def search(self, jql: str, max_results: int = 20) -> list[dict[str, Any]]:
        def call() -> dict[str, Any]:
            response = self._client.get(
                self._url("/rest/api/2/search"),
                headers=self._headers(),
                params={
                    "jql": jql,
                    "maxResults": max_results,
                    "fields": "summary,attachment,labels,status",
                },
            )
            response.raise_for_status()
            return response.json()

        return retry(call).get("issues") or []

    def download_attachment(self, url: str) -> bytes:
        def call() -> bytes:
            response = self._client.get(
                url,
                headers={"Authorization": self._auth_header(), "Accept": "*/*"},
                follow_redirects=True,
            )
            response.raise_for_status()
            return response.content

        return retry(call)

    def add_comment(self, key: str, body: str) -> dict[str, Any]:
        def call() -> dict[str, Any]:
            response = self._client.post(
                self._url(f"/rest/api/2/issue/{key}/comment"),
                headers=self._headers(),
                json={"body": body},
            )
            response.raise_for_status()
            return response.json()

        return retry(call)

    def add_labels(self, key: str, labels: list[str]) -> None:
        def call() -> None:
            response = self._client.put(
                self._url(f"/rest/api/2/issue/{key}"),
                headers=self._headers(),
                json={"update": {"labels": [{"add": label} for label in labels]}},
            )
            response.raise_for_status()

        retry(call)

    def set_verdict_field(self, key: str, value: str) -> None:
        field = self.settings.jira_verdict_field
        if not field:
            return

        def call() -> None:
            response = self._client.put(
                self._url(f"/rest/api/2/issue/{key}"),
                headers=self._headers(),
                json={"fields": {field: value}},
            )
            response.raise_for_status()

        retry(call)

    def attach_json(self, key: str, filename: str, content: bytes) -> None:
        def call() -> None:
            headers = {
                "Authorization": self._auth_header(),
                "X-Atlassian-Token": "no-check",
                "Accept": "application/json",
            }
            response = self._client.post(
                self._url(f"/rest/api/2/issue/{key}/attachments"),
                headers=headers,
                files={"file": (filename, content, "application/json")},
            )
            response.raise_for_status()

        retry(call)


def find_eml_attachments(issue: dict[str, Any]) -> list[dict[str, Any]]:
    attachments = (issue.get("fields") or {}).get("attachment") or []
    matches: list[dict[str, Any]] = []
    for item in attachments:
        name = (item.get("filename") or "").lower()
        mime = (item.get("mimeType") or "").lower()
        if name.endswith(EML_SUFFIXES) or mime in {"message/rfc822"}:
            matches.append(item)
        elif name.endswith(".eml") or (mime in EML_TYPES and name.endswith(".eml")):
            matches.append(item)
    return matches


def already_analyzed(issue: dict[str, Any], label: str) -> bool:
    labels = (issue.get("fields") or {}).get("labels") or []
    if label in labels:
        return True
    comments = ((issue.get("fields") or {}).get("comment") or {}).get("comments") or []
    for comment in comments:
        body = comment.get("body") or ""
        if "<!-- phishintel:v1 -->" in body:
            return True
    return False


class JiraReporterAgent:
    name = "jira-reporter"

    def __init__(self, client: JiraClient) -> None:
        self.client = client

    def publish(self, key: str, report: AnalysisReport) -> None:
        self.client.add_comment(key, wiki_comment(report))
        labels = [
            self.client.settings.jira_analyzed_label,
            report.label_for_verdict(),
        ]
        self.client.add_labels(key, labels)
        self.client.set_verdict_field(key, report.verdict.value)
        payload = report.model_dump_json(indent=2).encode("utf-8")
        try:
            self.client.attach_json(key, "phishintel-report.json", payload)
        except Exception:
            # Comment + labels are the critical path; JSON attach is best-effort.
            pass
