from __future__ import annotations

import re

TOKEN_RE = re.compile(
    r"(spf|dkim|dmarc)\s*=\s*([a-z0-9-]+)",
    re.I,
)
DKIM_DOMAIN_RE = re.compile(r"header\.i=@([^\s;]+)|header\.d=([^\s;]+)", re.I)
ENVELOPE_RE = re.compile(r"smtp\.mailfrom=([^\s;]+)", re.I)
HEADER_FROM_RE = re.compile(r"header\.from=([^\s;]+)", re.I)


def parse_authentication_results(raw: str | None) -> dict[str, str | None]:
    text = raw or ""
    result: dict[str, str | None] = {
        "spf": None,
        "dkim": None,
        "dmarc": None,
        "dkim_domain": None,
        "envelope_from": None,
        "header_from": None,
        "raw": text or None,
    }
    for match in TOKEN_RE.finditer(text):
        key = match.group(1).lower()
        value = match.group(2).lower()
        if result.get(key) is None:
            result[key] = value
    dkim_domain = DKIM_DOMAIN_RE.search(text)
    if dkim_domain:
        result["dkim_domain"] = (dkim_domain.group(1) or dkim_domain.group(2) or "").lower()
    envelope = ENVELOPE_RE.search(text)
    if envelope:
        result["envelope_from"] = envelope.group(1).lower()
    header_from = HEADER_FROM_RE.search(text)
    if header_from:
        result["header_from"] = header_from.group(1).lower()
    return result
