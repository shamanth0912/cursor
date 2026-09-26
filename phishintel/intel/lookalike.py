from __future__ import annotations

import tldextract
from rapidfuzz.distance import Levenshtein

from phishintel.models import LookalikeHit

CHAR_MAP = str.maketrans("01357@$!", "olestasi")
AFFIXES = (
    "secure",
    "login",
    "account",
    "verify",
    "support",
    "alert",
    "service",
    "online",
    "auth",
    "signin",
    "mail",
)

extract = tldextract.TLDExtract(
    suffix_list_urls=(),
    fallback_to_snapshot=True,
    extra_suffixes=("test", "example", "invalid", "localhost"),
)


def registered_domain(host: str) -> str:
    host = host.lower().strip(".")
    parts = extract(host)
    if parts.suffix:
        registered = (
            getattr(parts, "top_domain_under_public_suffix", None) or parts.registered_domain
        )
        if registered:
            return registered.lower()
    labels = host.split(".")
    if len(labels) >= 2:
        return ".".join(labels[-2:])
    return host


def registrable_sld(host: str) -> str:
    host = host.lower().strip(".")
    parts = extract(host)
    if parts.suffix and parts.domain:
        return parts.domain.lower()
    labels = host.split(".")
    if len(labels) >= 2:
        return labels[-2]
    return labels[0] if labels else host


def normalize_brand(value: str) -> str:
    value = value.lower()
    value = value.replace("rn", "m")
    return value.translate(CHAR_MAP)


def lookalike_hits(
    domain: str,
    *,
    org_domains: list[str],
    brands: list[str],
    max_distance: int = 2,
) -> list[LookalikeHit]:
    if not domain:
        return []
    sld = registrable_sld(domain)
    registered = registered_domain(domain)
    hits: list[LookalikeHit] = []
    seen: set[tuple[str, str]] = set()

    for org in org_domains:
        org_reg = registered_domain(org)
        org_sld = registrable_sld(org)
        if registered == org_reg:
            continue
        distance = Levenshtein.distance(sld, org_sld)
        if 0 < distance <= max_distance or normalize_brand(sld) == normalize_brand(org_sld):
            key = ("org", org_reg)
            if key not in seen:
                seen.add(key)
                hits.append(
                    LookalikeHit(
                        target=org_reg,
                        candidate=registered,
                        score=1.0 - (distance / max(len(sld), len(org_sld), 1)),
                        kind="org-lookalike",
                    )
                )

    for brand in brands:
        brand_n = normalize_brand(brand)
        if not brand_n:
            continue
        if _brand_impersonation(sld, brand):
            key = ("brand", brand)
            if key not in seen:
                seen.add(key)
                hits.append(
                    LookalikeHit(
                        target=brand,
                        candidate=registered,
                        score=0.92,
                        kind="brand-impersonation",
                    )
                )
            continue
        distance = Levenshtein.distance(sld, brand)
        if 0 < distance <= max_distance and abs(len(sld) - len(brand)) <= 2:
            key = ("brand", brand)
            if key not in seen:
                seen.add(key)
                hits.append(
                    LookalikeHit(
                        target=brand,
                        candidate=registered,
                        score=1.0 - (distance / max(len(sld), len(brand), 1)),
                        kind="brand-lookalike",
                    )
                )
    return hits


def _brand_impersonation(sld: str, brand: str) -> bool:
    n_sld = normalize_brand(sld).replace("-", "")
    n_brand = normalize_brand(brand).replace("-", "")
    if n_sld == n_brand:
        return sld != brand
    if n_sld.startswith(n_brand) and len(n_sld) > len(n_brand):
        remainder = normalize_brand(sld)[len(normalize_brand(brand)) :].strip("-")
        if remainder in AFFIXES or remainder.split("-")[0] in AFFIXES:
            return True
    # paypal vs paypa1-secure after homoglyph fold
    folded = normalize_brand(sld)
    if folded.startswith(normalize_brand(brand) + "-"):
        return True
    return False
