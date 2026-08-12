from phishintel.intel.unwrap import (
    detect_rewriter,
    is_mimecast_rewritten,
    mimecast_domain_hint,
    unwrap_locally,
    unwrap_proofpoint,
    unwrap_safelinks,
)


def test_mimecast_detect_and_domain_hint():
    url = "https://url.us.m.mimecastprotect.com/s/abc123xyz?domain=paypa1-secure.test"
    assert is_mimecast_rewritten(url)
    assert detect_rewriter(url) == "mimecast"
    assert mimecast_domain_hint(url) == "paypa1-secure.test"
    final, rewriter, source = unwrap_locally(url)
    assert rewriter == "mimecast"
    assert source is None
    assert final == url


def test_protect_host_mimecast():
    url = "https://protect-us.mimecast.com/s/abcdefg"
    assert is_mimecast_rewritten(url)


def test_safelinks_unwrap():
    url = (
        "https://nam.safelinks.protection.outlook.com/"
        "?url=https%3A%2F%2Fmicros0ft-login.test%2Fverify&data=abc&sdata=def&reserved=0"
    )
    assert unwrap_safelinks(url) == "https://micros0ft-login.test/verify"
    final, rewriter, source = unwrap_locally(url)
    assert rewriter == "safelinks"
    assert final == "https://micros0ft-login.test/verify"
    assert source == "safelinks-query"


def test_proofpoint_v2_unwrap():
    url = "https://urldefense.proofpoint.com/v2/url?u=https-3A__evil.test_login-3Fq-3D1&d=DwMFaQ"
    assert unwrap_proofpoint(url) == "https://evil.test/login?q=1"


def test_proofpoint_v3_unwrap():
    url = "https://urldefense.com/v3/__https://evil.test/path__;!!token$"
    assert unwrap_proofpoint(url) == "https://evil.test/path"
