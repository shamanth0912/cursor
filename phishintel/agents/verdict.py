from __future__ import annotations

import json
import re
from typing import Any

import httpx

from phishintel.config import Settings
from phishintel.models import (
    AiVerdict,
    AnalysisReport,
    Verdict,
)

LURE_RE = re.compile(
    r"\b(verify|password|credential|invoice|payment|urgent|suspend|mailbox|"
    r"wire transfer|gift card|reset your|confirm your account|dhl|fedex|"
    r"shared a (file|document)|action required)\b",
    re.I,
)


def heuristic_verdict(report: AnalysisReport) -> AiVerdict:
    score = 0
    rationale: list[str] = []
    sender = report.sender
    if sender.lookalikes:
        score += 25
        rationale.append(
            "Sender domain lookalike: "
            + ", ".join(f"{h.candidate}~{h.target}" for h in sender.lookalikes[:3])
        )
    auth_fails = [s for s in sender.spoof_signals if s.startswith(("spf-", "dkim-", "dmarc-"))]
    if auth_fails:
        score += 15
        rationale.append("Authentication failures: " + ", ".join(auth_fails))
    other_spoof = [s for s in sender.spoof_signals if s not in auth_fails]
    if other_spoof:
        score += 10
        rationale.append("Spoof indicators: " + ", ".join(other_spoof))

    mismatches = [u for u in report.urls if u.display_mismatch]
    if mismatches:
        score += 15
        rationale.append(f"{len(mismatches)} URL(s) with display-text mismatch")
    rewritten = [u for u in report.urls if u.rewriter == "mimecast"]
    if rewritten:
        rationale.append(f"{len(rewritten)} Mimecast-rewritten URL(s) decoded/queued")

    vt_malicious = [i for i in report.intel if i.provider == "virustotal" and i.malicious >= 3]
    vt_susp = [i for i in report.intel if i.provider == "virustotal" and i.verdict == "suspicious"]
    urlscan_mal = [i for i in report.intel if i.provider == "urlscan" and i.verdict == "malicious"]
    if vt_malicious:
        score += 40
        rationale.append("VirusTotal malicious detections: " + ", ".join(i.target for i in vt_malicious[:4]))
    elif vt_susp:
        score += 20
        rationale.append("VirusTotal suspicious detections present")
    if urlscan_mal:
        score += 35
        rationale.append("urlscan.io classified URL(s) as malicious")

    dangerous = [a for a in report.email.attachments if a.dangerous]
    if dangerous:
        score += 15
        rationale.append("Dangerous attachment type: " + ", ".join(a.filename for a in dangerous[:3]))

    body = f"{report.email.subject}\n{report.email.text_body}\n{report.email.html_body}"
    if LURE_RE.search(body):
        score += 10
        rationale.append("Credential/urgency lure language in subject or body")

    if vt_malicious or urlscan_mal or score >= 50:
        verdict = Verdict.MALICIOUS
        confidence = min(0.95, 0.55 + score / 200)
    elif score >= 25:
        verdict = Verdict.SUSPICIOUS
        confidence = min(0.8, 0.4 + score / 200)
    elif score == 0 and not report.urls and not report.intel:
        verdict = Verdict.INCONCLUSIVE
        confidence = 0.3
        rationale.append("Insufficient indicators for a confident verdict")
    else:
        verdict = Verdict.BENIGN
        confidence = 0.55 if score == 0 else 0.45
        if not rationale:
            rationale.append("No strong phishing indicators from headers, URLs, or intel")

    actions = _actions_for(verdict)
    iocs = _iocs(report)
    summary = (
        f"{verdict.value.upper()} ({int(confidence * 100)}% heuristic). "
        + (rationale[0] if rationale else "See details.")
    )
    return AiVerdict(
        verdict=verdict,
        confidence=round(confidence, 2),
        summary=summary,
        rationale=rationale,
        recommended_actions=actions,
        iocs=iocs,
        source="heuristic",
    )


def _actions_for(verdict: Verdict) -> list[str]:
    if verdict == Verdict.MALICIOUS:
        return [
            "Do not click links or open attachments",
            "Block sender domain and decoded URLs in Mimecast / email gateway",
            "Search mailbox for the same subject/sender and purge if confirmed",
            "Reset credentials if the user interacted with the message",
            "Notify the reporter that this is a confirmed phishing email",
        ]
    if verdict == Verdict.SUSPICIOUS:
        return [
            "Treat as phishing until proven otherwise",
            "Review decoded URLs and VT/urlscan links before releasing",
            "Ask the reporter whether they clicked or submitted credentials",
            "Hold similar messages at the gateway if volume is high",
        ]
    if verdict == Verdict.BENIGN:
        return [
            "Close as not phishing if the user expected this message",
            "Reply to the reporter with the benign finding",
        ]
    return [
        "Manual review required — attach a clean .eml if missing",
        "Check whether URLs are still wrapped and Mimecast decode succeeded",
    ]


def _iocs(report: AnalysisReport) -> list[str]:
    values: list[str] = []
    sender = report.sender
    if sender.from_addr.address:
        values.append(sender.from_addr.address)
    if sender.from_addr.domain:
        values.append(sender.from_addr.domain)
    if sender.reply_to.address and sender.reply_to.address != sender.from_addr.address:
        values.append(sender.reply_to.address)
    if sender.originating_ip:
        values.append(sender.originating_ip)
    for url in report.urls:
        values.append(url.final or url.original)
        if url.domain:
            values.append(url.domain)
    for att in report.email.attachments:
        if att.sha256:
            values.append(att.sha256)
    # de-dupe preserving order
    seen: set[str] = set()
    out: list[str] = []
    for item in values:
        if item and item not in seen:
            seen.add(item)
            out.append(item)
    return out[:25]


class VerdictAgent:
    name = "verdict"

    def __init__(self, settings: Settings, client: httpx.Client | None = None) -> None:
        self.settings = settings
        self._client = client or httpx.Client(timeout=settings.http_timeout_seconds)
        self._owns_client = client is None

    def close(self) -> None:
        if self._owns_client:
            self._client.close()

    def run(self, report: AnalysisReport) -> AiVerdict:
        baseline = heuristic_verdict(report)
        if self.settings.anthropic_api_key:
            try:
                return self._anthropic(report, baseline)
            except Exception as exc:  # noqa: BLE001
                report.errors.append(f"Anthropic verdict failed, using heuristic: {exc}")
                return baseline
        if self.settings.openai_api_key:
            try:
                return self._openai(report, baseline)
            except Exception as exc:  # noqa: BLE001
                report.errors.append(f"OpenAI verdict failed, using heuristic: {exc}")
                return baseline
        return baseline

    def _payload(self, report: AnalysisReport, baseline: AiVerdict) -> dict[str, Any]:
        return {
            "subject": report.email.subject,
            "sender": report.sender.model_dump(),
            "urls": [u.model_dump() for u in report.urls],
            "attachments": [a.model_dump() for a in report.email.attachments],
            "intel": [i.model_dump() for i in report.intel],
            "body_excerpt": (report.email.text_body or report.email.html_body)[:4000],
            "heuristic": baseline.model_dump(),
        }

    def _openai(self, report: AnalysisReport, baseline: AiVerdict) -> AiVerdict:
        body = {
            "model": self.settings.openai_model,
            "temperature": 0.1,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": _SYSTEM},
                {
                    "role": "user",
                    "content": json.dumps(self._payload(report, baseline), default=str),
                },
            ],
        }
        response = self._client.post(
            self.settings.openai_base_url.rstrip("/") + "/chat/completions",
            headers={
                "Authorization": f"Bearer {self.settings.openai_api_key}",
                "Content-Type": "application/json",
            },
            json=body,
        )
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"]
        return _parse_llm_json(content, source=f"openai:{self.settings.openai_model}")

    def _anthropic(self, report: AnalysisReport, baseline: AiVerdict) -> AiVerdict:
        response = self._client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": self.settings.anthropic_api_key,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json",
            },
            json={
                "model": self.settings.anthropic_model,
                "max_tokens": 1200,
                "temperature": 0.1,
                "system": _SYSTEM,
                "messages": [
                    {
                        "role": "user",
                        "content": json.dumps(self._payload(report, baseline), default=str),
                    }
                ],
            },
        )
        response.raise_for_status()
        content = response.json()["content"][0]["text"]
        return _parse_llm_json(content, source=f"anthropic:{self.settings.anthropic_model}")


_SYSTEM = """You are a senior email security analyst. Given structured evidence from a reported phishing email, produce a JSON object with keys:
verdict (one of: malicious, suspicious, benign, inconclusive),
confidence (0-1 float),
summary (2-3 sentences),
rationale (array of short bullet strings),
recommended_actions (array of concrete SOC actions),
iocs (array of emails, domains, IPs, URLs, hashes).
Weight VirusTotal and urlscan.io detections, Mimecast-decoded destinations (not the wrapper), SPF/DKIM/DMARC, lookalike domains, and href vs visible text mismatches. Do not treat Mimecast/Safe Links wrapper hosts as malicious. Be conservative: benign only when auth is healthy and intel is clean. Return JSON only."""


def _parse_llm_json(content: str, *, source: str) -> AiVerdict:
    content = content.strip()
    if content.startswith("```"):
        content = re.sub(r"^```(?:json)?\s*|\s*```$", "", content, flags=re.I | re.S)
    data = json.loads(content)
    verdict = Verdict(str(data.get("verdict", "inconclusive")).lower())
    return AiVerdict(
        verdict=verdict,
        confidence=float(data.get("confidence") or 0.5),
        summary=str(data.get("summary") or ""),
        rationale=[str(x) for x in data.get("rationale") or []],
        recommended_actions=[str(x) for x in data.get("recommended_actions") or []],
        iocs=[str(x) for x in data.get("iocs") or []],
        source=source,
    )
