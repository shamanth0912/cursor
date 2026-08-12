from __future__ import annotations

import ipaddress
import re
from urllib.parse import parse_qs, unquote, urlparse

MIMECAST_HOST_RE = re.compile(
    r"(?:^|\.)("
    r"mimecastprotect\.com|"
    r"mimecast\.com"
    r")$",
    re.I,
)
MIMECAST_PATH_HINTS = ("/s/", "/user/", "/click/")
SAFELINKS_HOST_RE = re.compile(r"safelinks\.protection\.outlook\.com$", re.I)
PROOFPOINT_HOST_RE = re.compile(r"(urldefense\.proofpoint\.com|urldefense\.com)$", re.I)
PROOFPOINT_V2_HEX = re.compile(r"-([A-Fa-f0-9]{2})")
PROOFPOINT_V3_RE = re.compile(r"/v3/__(.+?)__")

REWRITER_MIMECAST = "mimecast"
REWRITER_SAFELINKS = "safelinks"
REWRITER_PROOFPOINT = "proofpoint"


def hostname(url: str) -> str:
    try:
        return (urlparse(url).hostname or "").lower()
    except Exception:
        return ""


def is_mimecast_rewritten(url: str) -> bool:
    host = hostname(url)
    if not host:
        return False
    if host.endswith(".mimecastprotect.com"):
        return True
    if MIMECAST_HOST_RE.search(host) and any(h in url.lower() for h in MIMECAST_PATH_HINTS):
        return True
    if host.startswith("protect-") and host.endswith(".mimecast.com"):
        return True
    return False


def detect_rewriter(url: str) -> str | None:
    host = hostname(url)
    if not host:
        return None
    if is_mimecast_rewritten(url):
        return REWRITER_MIMECAST
    if SAFELINKS_HOST_RE.search(host):
        return REWRITER_SAFELINKS
    if PROOFPOINT_HOST_RE.search(host):
        return REWRITER_PROOFPOINT
    return None


def mimecast_domain_hint(url: str) -> str | None:
    """Mimecast often appends ?domain=apex without the full destination URL."""
    try:
        qs = parse_qs(urlparse(url).query)
    except Exception:
        return None
    values = qs.get("domain") or []
    if not values:
        return None
    hint = values[0].strip().lower()
    return hint or None


def unwrap_safelinks(url: str) -> str | None:
    try:
        qs = parse_qs(urlparse(url).query)
    except Exception:
        return None
    values = qs.get("url") or []
    if not values:
        return None
    return unquote(values[0])


def unwrap_proofpoint(url: str) -> str | None:
    parsed = urlparse(url)
    host = (parsed.hostname or "").lower()
    if "urldefense.proofpoint.com" in host or (
        host.endswith("urldefense.com") and "/v2/" in parsed.path
    ):
        qs = parse_qs(parsed.query)
        raw = (qs.get("u") or [None])[0]
        if not raw:
            return None
        decoded = PROOFPOINT_V2_HEX.sub(lambda m: chr(int(m.group(1), 16)), raw)
        return decoded.replace("_", "/")
    match = PROOFPOINT_V3_RE.search(url)
    if match:
        return match.group(1)
    return None


def unwrap_locally(url: str) -> tuple[str, str | None, str | None]:
    """Return (final_or_original, rewriter, decode_source)."""
    rewriter = detect_rewriter(url)
    if rewriter == REWRITER_SAFELINKS:
        decoded = unwrap_safelinks(url)
        if decoded:
            return decoded, rewriter, "safelinks-query"
        return url, rewriter, None
    if rewriter == REWRITER_PROOFPOINT:
        decoded = unwrap_proofpoint(url)
        if decoded:
            return decoded, rewriter, "proofpoint"
        return url, rewriter, None
    if rewriter == REWRITER_MIMECAST:
        return url, rewriter, None
    return url, None, None


def is_internal_target(url: str) -> bool:
    parsed = urlparse(url)
    host = (parsed.hostname or "").lower()
    if not host:
        return True
    if host in {"localhost", "127.0.0.1", "::1"}:
        return True
    if host.endswith(".local") or host.endswith(".internal") or host.endswith(".lan"):
        return True
    try:
        ip = ipaddress.ip_address(host)
        return bool(ip.is_private or ip.is_loopback or ip.is_link_local)
    except ValueError:
        return False
