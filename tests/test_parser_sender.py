from pathlib import Path

from phishintel.agents.parser import parse_eml
from phishintel.agents.sender import analyze_sender
from phishintel.config import Settings

FIXTURES = Path(__file__).parent / "fixtures"


def test_parse_phishing_mimecast_eml():
    parsed = parse_eml((FIXTURES / "phishing_mimecast.eml").read_bytes())
    assert "verify your mailbox" in parsed.subject.lower()
    assert parsed.urls
    url = parsed.urls[0]
    assert url.rewriter == "mimecast"
    assert url.display_mismatch
    assert "paypal.com" in (url.display_text or "")


def test_parse_nested_safelinks():
    parsed = parse_eml((FIXTURES / "nested_safelinks.eml").read_bytes())
    assert parsed.nested is not None
    inner = parsed.nested
    assert "micros0ft-login.test" in inner.from_raw
    assert any(u.rewriter == "safelinks" for u in inner.urls)
    decoded = [u for u in inner.urls if u.decoded]
    assert decoded
    assert "micros0ft-login.test/verify" in decoded[0].decoded


def test_sender_lookalike_and_auth_fail():
    parsed = parse_eml((FIXTURES / "phishing_mimecast.eml").read_bytes())
    settings = Settings(org_domains="company.test", org_brands="paypal,microsoft")
    sender = analyze_sender(parsed, settings)
    assert sender.auth.spf == "fail"
    assert sender.auth.dmarc == "fail"
    assert "from-return-path-domain-mismatch" in sender.spoof_signals
    assert "from-reply-to-domain-mismatch" in sender.spoof_signals
    assert sender.lookalikes
    assert any(hit.target == "paypal" for hit in sender.lookalikes)
    assert sender.originating_ip == "203.0.113.50"


def test_benign_internal_sender():
    parsed = parse_eml((FIXTURES / "benign_internal.eml").read_bytes())
    settings = Settings(org_domains="company.test", org_brands="paypal")
    sender = analyze_sender(parsed, settings)
    assert sender.auth.dmarc == "pass"
    assert sender.lookalikes == []
    assert "spf-fail" not in sender.spoof_signals
