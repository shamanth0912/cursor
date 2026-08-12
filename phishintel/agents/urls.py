from phishintel.intel.unwrap import mimecast_domain_hint
from phishintel.models import ExtractedUrl, ParsedEmail


def collect_urls(parsed: ParsedEmail, *, max_urls: int) -> list[ExtractedUrl]:
    target = parsed.nested or parsed
    urls = list(target.urls)
    if parsed.nested and parsed.urls:
        # Include wrapper URLs only if they add new destinations.
        seen = {u.original for u in urls}
        for url in parsed.urls:
            if url.original not in seen:
                urls.append(url)
    for url in urls:
        if url.rewriter == "mimecast" and not url.decoded:
            hint = mimecast_domain_hint(url.original)
            if hint:
                url.domain = hint
    return urls[:max_urls]
