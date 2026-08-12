from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class Verdict(str, Enum):
    MALICIOUS = "malicious"
    SUSPICIOUS = "suspicious"
    BENIGN = "benign"
    INCONCLUSIVE = "inconclusive"


class EmailAddress(BaseModel):
    display_name: str = ""
    address: str = ""
    domain: str = ""


class AuthResults(BaseModel):
    spf: str | None = None
    dkim: str | None = None
    dmarc: str | None = None
    dkim_domain: str | None = None
    envelope_from: str | None = None
    header_from: str | None = None
    raw: str | None = None


class LookalikeHit(BaseModel):
    target: str
    candidate: str
    score: float
    kind: str


class ExtractedUrl(BaseModel):
    original: str
    display_text: str | None = None
    rewriter: str | None = None
    decoded: str | None = None
    final: str
    domain: str = ""
    display_mismatch: bool = False
    source: str = "body"
    decode_source: str | None = None


class AttachmentInfo(BaseModel):
    filename: str
    content_type: str = ""
    size: int = 0
    md5: str = ""
    sha1: str = ""
    sha256: str = ""
    dangerous: bool = False
    nested_eml: bool = False


class SenderAnalysis(BaseModel):
    from_addr: EmailAddress = Field(default_factory=EmailAddress)
    return_path: EmailAddress = Field(default_factory=EmailAddress)
    reply_to: EmailAddress = Field(default_factory=EmailAddress)
    message_id: str = ""
    originating_ip: str | None = None
    originating_received: str | None = None
    auth: AuthResults = Field(default_factory=AuthResults)
    spoof_signals: list[str] = Field(default_factory=list)
    lookalikes: list[LookalikeHit] = Field(default_factory=list)
    risk_score: int = 0


class IntelResult(BaseModel):
    provider: str
    target: str
    target_type: str
    verdict: str = "unknown"
    malicious: int = 0
    suspicious: int = 0
    harmless: int = 0
    undetected: int = 0
    permalink: str | None = None
    summary: str = ""
    extra: dict[str, Any] = Field(default_factory=dict)


class ParsedEmail(BaseModel):
    subject: str = ""
    from_raw: str = ""
    to_raw: str = ""
    return_path_raw: str = ""
    reply_to_raw: str = ""
    message_id: str = ""
    date: str = ""
    headers: dict[str, str] = Field(default_factory=dict)
    received: list[str] = Field(default_factory=list)
    authentication_results: str = ""
    text_body: str = ""
    html_body: str = ""
    attachments: list[AttachmentInfo] = Field(default_factory=list)
    nested: ParsedEmail | None = None
    urls: list[ExtractedUrl] = Field(default_factory=list)


class AiVerdict(BaseModel):
    verdict: Verdict = Verdict.INCONCLUSIVE
    confidence: float = 0.0
    summary: str = ""
    rationale: list[str] = Field(default_factory=list)
    recommended_actions: list[str] = Field(default_factory=list)
    iocs: list[str] = Field(default_factory=list)
    source: str = "heuristic"


class AnalysisReport(BaseModel):
    verdict: Verdict = Verdict.INCONCLUSIVE
    confidence: float = 0.0
    summary: str = ""
    rationale: list[str] = Field(default_factory=list)
    recommended_actions: list[str] = Field(default_factory=list)
    iocs: list[str] = Field(default_factory=list)
    verdict_source: str = "heuristic"
    sender: SenderAnalysis = Field(default_factory=SenderAnalysis)
    email: ParsedEmail = Field(default_factory=ParsedEmail)
    urls: list[ExtractedUrl] = Field(default_factory=list)
    intel: list[IntelResult] = Field(default_factory=list)
    errors: list[str] = Field(default_factory=list)
    ticket_key: str | None = None

    def label_for_verdict(self) -> str:
        return f"phish-{self.verdict.value}"
