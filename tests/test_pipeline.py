from pathlib import Path

from phishintel.agents.verdict import heuristic_verdict
from phishintel.config import Settings
from phishintel.models import Verdict
from phishintel.pipeline import PhishPipeline
from phishintel.reporting.jira_comment import wiki_comment

FIXTURES = Path(__file__).parent / "fixtures"


def _offline_settings() -> Settings:
    return Settings(
        org_domains="company.test",
        org_brands="paypal,microsoft",
        virustotal_api_key="",
        urlscan_api_key="",
        openai_api_key="",
        anthropic_api_key="",
        mimecast_client_id="",
        mimecast_client_secret="",
    )


def test_pipeline_phishing_heuristic_without_apis():
    data = (FIXTURES / "phishing_mimecast.eml").read_bytes()
    with PhishPipeline(_offline_settings()) as pipeline:
        report = pipeline.analyze_eml(data)
    assert report.verdict in {Verdict.SUSPICIOUS, Verdict.MALICIOUS}
    assert report.verdict_source == "heuristic"
    assert any("lookalike" in item.lower() or "authentication" in item.lower() for item in report.rationale)
    assert report.urls[0].rewriter == "mimecast"
    wiki = wiki_comment(report)
    assert "PhishIntel analysis" in wiki
    assert "<!-- phishintel:v1 -->" in wiki
    assert report.sender.from_addr.address.endswith("paypa1-secure.test")


def test_pipeline_benign_internal():
    data = (FIXTURES / "benign_internal.eml").read_bytes()
    with PhishPipeline(_offline_settings()) as pipeline:
        report = pipeline.analyze_eml(data)
    assert report.verdict in {Verdict.BENIGN, Verdict.INCONCLUSIVE, Verdict.SUSPICIOUS}
    # Internal auth-passing mail should not be malicious on heuristics alone.
    assert report.verdict != Verdict.MALICIOUS


def test_pipeline_nested_safelinks_uses_inner_message():
    data = (FIXTURES / "nested_safelinks.eml").read_bytes()
    with PhishPipeline(_offline_settings()) as pipeline:
        report = pipeline.analyze_eml(data)
    assert "micros0ft-login.test" in report.sender.from_addr.address
    assert any(u.rewriter == "safelinks" for u in report.urls)
    assert any("microsoft.com" in (u.display_text or "") for u in report.urls)


def test_heuristic_uses_vt_malicious():
    data = (FIXTURES / "benign_internal.eml").read_bytes()
    with PhishPipeline(_offline_settings()) as pipeline:
        report = pipeline.analyze_eml(data)
    from phishintel.models import IntelResult

    report.intel.append(
        IntelResult(
            provider="virustotal",
            target="https://evil.test",
            target_type="url",
            verdict="malicious",
            malicious=8,
            permalink="https://www.virustotal.com/gui/url/x",
        )
    )
    ai = heuristic_verdict(report)
    assert ai.verdict == Verdict.MALICIOUS
