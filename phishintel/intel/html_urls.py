from __future__ import annotations

import re
from html import unescape
from urllib.parse import urlparse

from bs4 import BeautifulSoup

from phishintel.intel.lookalike import registered_domain
from phishintel.intel.unwrap import detect_rewriter, unwrap_locally
from phishintel.models import ExtractedUrl

BARE_URL_RE = re.compile(r"https?://[^\s<>\"']+", re.I)
DANGEROUS_SCHEMES = {"http", "https"}


def _clean_url(url: str) -> str:
    url = unescape(url.strip())
    return url.rstrip(").,;]>\"'")


def _domain(url: str) -> str:
    try:
        return (urlparse(url).hostname or "").lower()
    except Exception:
        return ""


def _looks_like_url(text: str) -> bool:
    text = text.strip()
    return bool(re.search(r"https?://|\.[a-z]{2,}/|\.[a-z]{2,}$", text, re.I))


def href_text_mismatch(href: str, text: str | None) -> bool:
    if not text or not _looks_like_url(text):
        return False
    href_host = _domain(href)
    text_host = _domain(text if "://" in text else f"https://{text}")
    if not href_host or not text_host:
        return False
    return registered_domain(href_host) != registered_domain(text_host)


def extract_urls(text_body: str, html_body: str, *, max_urls: int = 15) -> list[ExtractedUrl]:
    found: list[ExtractedUrl] = []
    seen: set[str] = set()

    def add(url: str, display: str | None, source: str) -> None:
        url = _clean_url(url)
        if not url or url in seen:
            return
        parsed = urlparse(url)
        if parsed.scheme.lower() not in DANGEROUS_SCHEMES:
            return
        seen.add(url)
        final, rewriter, decode_source = unwrap_locally(url)
        final_domain = _domain(final) or _domain(url)
        display_mismatch = href_text_mismatch(final if rewriter != "mimecast" else url, display)
        # For Mimecast, compare display text against the domain hint when present.
        found.append(
            ExtractedUrl(
                original=url,
                display_text=(display or "").strip() or None,
                rewriter=rewriter or detect_rewriter(url),
                decoded=final if final != url else None,
                final=final,
                domain=final_domain,
                display_mismatch=display_mismatch,
                source=source,
                decode_source=decode_source,
            )
        )

    if html_body:
        soup = BeautifulSoup(html_body, "lxml")
        for tag in soup.find_all("a", href=True):
            href = tag.get("href") or ""
            text = tag.get_text(" ", strip=True)
            add(href, text, "html-href")
        for tag in soup.find_all(["img", "script", "iframe"], src=True):
            src = tag.get("src") or ""
            if src.lower().startswith("cid:"):
                continue
            add(src, None, f"html-{tag.name}")

    for match in BARE_URL_RE.finditer(text_body or ""):
        add(match.group(0), None, "text")
    for match in BARE_URL_RE.finditer(html_body or ""):
        add(match.group(0), None, "html-bare")

    # Prefer rewritten + mismatched links first.
    found.sort(
        key=lambda u: (
            0 if u.rewriter else 1,
            0 if u.display_mismatch else 1,
            u.original,
        )
    )
    return found[:max_urls]
