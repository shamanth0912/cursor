from phishintel.intel.lookalike import lookalike_hits


def test_paypal_typosquat_with_secure_affix():
    hits = lookalike_hits(
        "paypa1-secure.test",
        org_domains=["company.test"],
        brands=["paypal", "microsoft"],
    )
    assert any(h.target == "paypal" for h in hits)


def test_microsoft_homoglyph_login():
    hits = lookalike_hits(
        "micros0ft-login.test",
        org_domains=["company.test"],
        brands=["microsoft"],
    )
    assert any(h.target == "microsoft" for h in hits)


def test_org_domain_near_miss():
    hits = lookalike_hits(
        "companyy.test",
        org_domains=["company.test"],
        brands=[],
    )
    assert any(h.kind == "org-lookalike" for h in hits)
