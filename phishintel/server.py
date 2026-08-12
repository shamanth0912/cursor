from __future__ import annotations

import hashlib
import hmac
import json
from typing import Any

from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.responses import JSONResponse

from phishintel.agents.jira import JiraClient
from phishintel.config import Settings, get_settings
from phishintel.ingest import analyze_jira_issue
from phishintel.pipeline import PhishPipeline

app = FastAPI(title="PhishIntel", version="0.1.0")
_settings: Settings | None = None
_pipeline: PhishPipeline | None = None


def get_app_settings() -> Settings:
    global _settings
    if _settings is None:
        _settings = get_settings()
    return _settings


def get_pipeline() -> PhishPipeline:
    global _pipeline
    if _pipeline is None:
        _pipeline = PhishPipeline(get_app_settings())
    return _pipeline


@app.get("/health")
def health() -> dict[str, Any]:
    settings = get_app_settings()
    return {
        "ok": True,
        "jira": settings.jira_enabled(),
        "virustotal": bool(settings.virustotal_api_key),
        "urlscan": bool(settings.urlscan_api_key),
        "mimecast": settings.mimecast_enabled(),
        "llm": bool(settings.openai_api_key or settings.anthropic_api_key),
    }


@app.post("/hooks/jira")
async def jira_webhook(
    request: Request,
    x_hub_signature: str | None = Header(default=None),
    x_phishintel_secret: str | None = Header(default=None),
) -> JSONResponse:
    settings = get_app_settings()
    raw = await request.body()
    _verify_secret(settings, raw, x_hub_signature, x_phishintel_secret)
    try:
        payload = json.loads(raw.decode("utf-8") or "{}")
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="invalid JSON") from exc
    event = payload.get("webhookEvent") or payload.get("issue_event_type_name") or ""
    issue = payload.get("issue") or {}
    key = issue.get("key")
    if not key:
        return JSONResponse({"ok": True, "skipped": "no-issue-key"})
    interesting = (
        event.startswith("jira:issue_created")
        or event.startswith("jira:issue_updated")
        or "issue_created" in event
        or not event
    )
    if not interesting:
        return JSONResponse({"ok": True, "skipped": event})

    if not settings.jira_enabled():
        raise HTTPException(status_code=500, detail="Jira is not configured on the analyzer")

    jira = JiraClient(settings)
    try:
        report = analyze_jira_issue(
            key,
            settings=settings,
            pipeline=get_pipeline(),
            jira=jira,
            force=False,
        )
    finally:
        jira.close()

    skipped = "skipped-already-analyzed" in report.errors
    return JSONResponse(
        {
            "ok": True,
            "issue": key,
            "verdict": report.verdict.value,
            "skipped": skipped,
        }
    )


@app.post("/analyze/{issue_key}")
def analyze_issue(issue_key: str, force: bool = False) -> dict[str, Any]:
    settings = get_app_settings()
    if not settings.jira_enabled():
        raise HTTPException(status_code=500, detail="Jira is not configured")
    jira = JiraClient(settings)
    try:
        report = analyze_jira_issue(
            issue_key,
            settings=settings,
            pipeline=get_pipeline(),
            jira=jira,
            force=force,
        )
    finally:
        jira.close()
    return {
        "ok": True,
        "issue": issue_key,
        "verdict": report.verdict.value,
        "confidence": report.confidence,
        "summary": report.summary,
    }


def _verify_secret(
    settings: Settings,
    raw: bytes,
    signature: str | None,
    header_secret: str | None,
) -> None:
    secret = settings.jira_webhook_secret
    if not secret:
        return
    if header_secret and hmac.compare_digest(header_secret, secret):
        return
    if signature:
        expected = "sha256=" + hmac.new(secret.encode(), raw, hashlib.sha256).hexdigest()
        if hmac.compare_digest(signature, expected):
            return
        # Some Jira apps send the raw secret.
        if hmac.compare_digest(signature, secret):
            return
    raise HTTPException(status_code=401, detail="invalid webhook secret")


def run_server(settings: Settings | None = None) -> None:
    global _settings, _pipeline
    _settings = settings or get_settings()
    _pipeline = PhishPipeline(_settings)
    import uvicorn

    uvicorn.run(app, host=_settings.host, port=_settings.port)
