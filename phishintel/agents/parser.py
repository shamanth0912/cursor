from __future__ import annotations

import hashlib
import ipaddress
import re
from email import policy
from email.header import decode_header, make_header
from email.message import Message
from email.parser import BytesParser
from email.utils import getaddresses, parseaddr

from phishintel.intel.html_urls import extract_urls
from phishintel.models import AttachmentInfo, ParsedEmail

DANGEROUS_EXTENSIONS = {
    ".exe",
    ".js",
    ".jse",
    ".vbs",
    ".vbe",
    ".wsf",
    ".wsh",
    ".scr",
    ".bat",
    ".cmd",
    ".com",
    ".pif",
    ".jar",
    ".msi",
    ".iso",
    ".img",
    ".lnk",
    ".one",
    ".html",
    ".htm",
    ".svg",
    ".docm",
    ".xlsm",
    ".pptm",
    ".zip",
    ".rar",
    ".7z",
    ".iso",
    ".dll",
    ".ps1",
    ".hta",
}

IP_RE = re.compile(
    r"(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)"
    r"|\[[0-9a-fA-F:]+\]"
)


def decode_header_value(value: str | None) -> str:
    if not value:
        return ""
    try:
        return str(make_header(decode_header(value)))
    except Exception:
        return value


def parse_eml(data: bytes, *, max_urls: int = 15) -> ParsedEmail:
    msg = BytesParser(policy=policy.default).parsebytes(data)
    return _parse_message(msg, max_urls=max_urls)


def _header(msg: Message, name: str) -> str:
    return decode_header_value(msg.get(name))


def _parse_message(msg: Message, *, max_urls: int) -> ParsedEmail:
    interesting = (
        "from",
        "to",
        "cc",
        "return-path",
        "reply-to",
        "subject",
        "message-id",
        "date",
        "authentication-results",
        "received-spf",
        "dkim-signature",
        "x-originating-ip",
        "x-sender-ip",
        "x-mailer",
        "x-originating-email",
    )
    headers = {name: _header(msg, name) for name in interesting if msg.get(name)}
    received = [decode_header_value(v) for v in (msg.get_all("received") or [])]
    text_body, html_body, attachments, nested = _walk_parts(msg, max_urls=max_urls)
    parsed = ParsedEmail(
        subject=headers.get("subject", ""),
        from_raw=headers.get("from", ""),
        to_raw=headers.get("to", ""),
        return_path_raw=headers.get("return-path", ""),
        reply_to_raw=headers.get("reply-to", ""),
        message_id=headers.get("message-id", ""),
        date=headers.get("date", ""),
        headers=headers,
        received=received,
        authentication_results=headers.get("authentication-results", ""),
        text_body=text_body,
        html_body=html_body,
        attachments=attachments,
        nested=nested,
        urls=extract_urls(text_body, html_body, max_urls=max_urls),
    )
    return parsed


def _walk_parts(
    msg: Message, *, max_urls: int
) -> tuple[str, str, list[AttachmentInfo], ParsedEmail | None]:
    text_parts: list[str] = []
    html_parts: list[str] = []
    attachments: list[AttachmentInfo] = []
    nested: ParsedEmail | None = None

    parts: list[Message]
    if msg.is_multipart():
        parts = list(msg.walk())
    else:
        parts = [msg]

    for part in parts:
        ctype = (part.get_content_type() or "").lower()
        disposition = (part.get_content_disposition() or "").lower()
        filename = part.get_filename() or ""

        if ctype == "message/rfc822":
            payload = part.get_payload()
            inner: Message | None = None
            if isinstance(payload, list) and payload:
                inner = payload[0]
            elif isinstance(payload, Message):
                inner = payload
            else:
                raw = part.get_payload(decode=True) or b""
                if raw:
                    inner = BytesParser(policy=policy.default).parsebytes(raw)
            if inner is not None:
                nested = _parse_message(inner, max_urls=max_urls)
            continue

        if ctype.startswith("multipart/"):
            continue

        payload = part.get_payload(decode=True)
        if payload is None:
            continue
        if not isinstance(payload, (bytes, bytearray)):
            payload = str(payload).encode("utf-8", errors="replace")
        data = bytes(payload)

        is_attachment = disposition == "attachment" or bool(filename)
        if is_attachment and ctype not in {"text/plain", "text/html"}:
            attachments.append(_attachment_info(filename or "unnamed", ctype, data))
            continue

        if ctype == "text/html":
            html_parts.append(_decode_text(part, data))
        elif ctype == "text/plain":
            text_parts.append(_decode_text(part, data))
        elif is_attachment:
            attachments.append(_attachment_info(filename or "unnamed", ctype, data))

    return "\n".join(text_parts), "\n".join(html_parts), attachments, nested


def _decode_text(part: Message, data: bytes) -> str:
    charset = part.get_content_charset() or "utf-8"
    try:
        return data.decode(charset, errors="replace")
    except LookupError:
        return data.decode("utf-8", errors="replace")


def _attachment_info(filename: str, content_type: str, data: bytes) -> AttachmentInfo:
    lower = filename.lower()
    dangerous = any(lower.endswith(ext) for ext in DANGEROUS_EXTENSIONS)
    return AttachmentInfo(
        filename=filename,
        content_type=content_type,
        size=len(data),
        md5=hashlib.md5(data).hexdigest(),
        sha1=hashlib.sha1(data).hexdigest(),
        sha256=hashlib.sha256(data).hexdigest(),
        dangerous=dangerous,
        nested_eml=content_type == "message/rfc822" or lower.endswith(".eml"),
    )


def first_address(raw: str) -> tuple[str, str]:
    name, addr = parseaddr(raw or "")
    if addr:
        return decode_header_value(name), addr.lower()
    parsed = getaddresses([raw or ""])
    if parsed:
        return decode_header_value(parsed[0][0]), parsed[0][1].lower()
    return "", ""


def extract_originating_ip(headers: dict[str, str], received: list[str]) -> str | None:
    for key in ("x-originating-ip", "x-sender-ip"):
        value = headers.get(key, "")
        match = IP_RE.search(value)
        if match:
            return _normalize_ip(match.group(0))
    if received:
        # Last Received header is typically the originating hop.
        match = IP_RE.search(received[-1])
        if match:
            return _normalize_ip(match.group(0))
    return None


def _normalize_ip(value: str) -> str:
    value = value.strip("[]")
    try:
        return str(ipaddress.ip_address(value))
    except ValueError:
        return value
