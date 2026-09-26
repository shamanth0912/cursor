from __future__ import annotations

from phishintel.agents.parser import extract_originating_ip, first_address
from phishintel.config import Settings
from phishintel.intel.auth_results import parse_authentication_results
from phishintel.intel.lookalike import lookalike_hits, registered_domain
from phishintel.models import AuthResults, EmailAddress, ParsedEmail, SenderAnalysis

FAIL_STATUSES = {"fail", "softfail", "none", "temperror", "permerror"}


def analyze_sender(parsed: ParsedEmail, settings: Settings) -> SenderAnalysis:
    target = parsed.nested or parsed
    from_name, from_addr = first_address(target.from_raw)
    rp_name, rp_addr = first_address(target.return_path_raw)
    rt_name, rt_addr = first_address(target.reply_to_raw)
    from_domain = from_addr.split("@")[-1] if "@" in from_addr else ""
    rp_domain = rp_addr.split("@")[-1] if "@" in rp_addr else ""
    rt_domain = rt_addr.split("@")[-1] if "@" in rt_addr else ""

    auth_raw = parse_authentication_results(target.authentication_results)
    auth = AuthResults(**auth_raw)
    originating_ip = extract_originating_ip(target.headers, target.received)
    signals: list[str] = []

    if from_addr and rp_addr and registered_domain(from_domain) != registered_domain(rp_domain):
        signals.append("from-return-path-domain-mismatch")
    if from_addr and rt_addr and registered_domain(from_domain) != registered_domain(rt_domain):
        signals.append("from-reply-to-domain-mismatch")
    if auth.spf in FAIL_STATUSES:
        signals.append(f"spf-{auth.spf}")
    if auth.dkim in FAIL_STATUSES:
        signals.append(f"dkim-{auth.dkim}")
    if auth.dmarc in FAIL_STATUSES:
        signals.append(f"dmarc-{auth.dmarc}")
    if from_name and _looks_internal_display(from_name, settings) and not _is_org_domain(
        from_domain, settings
    ):
        signals.append("internal-display-name-external-domain")
    if target.message_id:
        mid_domain = _message_id_domain(target.message_id)
        if mid_domain and from_domain and registered_domain(mid_domain) != registered_domain(
            from_domain
        ):
            signals.append("message-id-domain-mismatch")

    lookalikes = lookalike_hits(
        from_domain,
        org_domains=settings.org_domain_list(),
        brands=settings.org_brand_list(),
    )
    if lookalikes:
        signals.append("lookalike-sender-domain")

    risk = min(100, 15 * len(signals) + 20 * len(lookalikes))
    return SenderAnalysis(
        from_addr=EmailAddress(display_name=from_name, address=from_addr, domain=from_domain),
        return_path=EmailAddress(display_name=rp_name, address=rp_addr, domain=rp_domain),
        reply_to=EmailAddress(display_name=rt_name, address=rt_addr, domain=rt_domain),
        message_id=target.message_id,
        originating_ip=originating_ip,
        originating_received=target.received[-1] if target.received else None,
        auth=auth,
        spoof_signals=signals,
        lookalikes=lookalikes,
        risk_score=risk,
    )


def _message_id_domain(message_id: str) -> str:
    value = message_id.strip("<>")
    if "@" in value:
        return value.split("@", 1)[1].strip().lower()
    return ""


def _is_org_domain(domain: str, settings: Settings) -> bool:
    if not domain:
        return False
    registered = registered_domain(domain)
    return any(registered == registered_domain(org) for org in settings.org_domain_list())


def _looks_internal_display(name: str, settings: Settings) -> bool:
    lowered = name.lower()
    tokens = [
        "it support",
        "helpdesk",
        "help desk",
        "human resources",
        "hr team",
        "payroll",
        "invoice",
        "ceo",
        "cfo",
        "admin",
        "security team",
        "servicedesk",
        "service desk",
    ]
    tokens.extend(settings.org_brand_list())
    tokens.extend(settings.org_domain_list())
    return any(token in lowered for token in tokens if token)
