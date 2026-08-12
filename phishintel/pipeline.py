from __future__ import annotations

from phishintel.agents.mimecast import MimecastAgent, MimecastClient
from phishintel.agents.parser import parse_eml
from phishintel.agents.sender import analyze_sender
from phishintel.agents.urls import collect_urls
from phishintel.agents.urlscan import UrlscanAgent, UrlscanClient
from phishintel.agents.verdict import VerdictAgent
from phishintel.agents.virustotal import VirusTotalAgent, VirusTotalClient
from phishintel.config import Settings, get_settings
from phishintel.intel.html_urls import extract_urls, href_text_mismatch
from phishintel.models import AnalysisReport, ParsedEmail


class PhishPipeline:
    """Runs parse → sender → URL unwrap → Mimecast/VT/urlscan → AI verdict."""

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self.mimecast = MimecastClient(self.settings)
        self.virustotal = VirusTotalClient(self.settings)
        self.urlscan = UrlscanClient(self.settings)
        self.verdict_agent = VerdictAgent(self.settings)

    def close(self) -> None:
        self.mimecast.close()
        self.virustotal.close()
        self.urlscan.close()
        self.verdict_agent.close()

    def __enter__(self) -> PhishPipeline:
        return self

    def __exit__(self, *args: object) -> None:
        self.close()

    def analyze_eml(
        self,
        data: bytes,
        *,
        extra_text: str = "",
        ticket_key: str | None = None,
    ) -> AnalysisReport:
        errors: list[str] = []
        parsed = parse_eml(data, max_urls=self.settings.max_urls)
        if extra_text:
            extras = extract_urls(extra_text, "", max_urls=self.settings.max_urls)
            seen = {u.original for u in parsed.urls}
            for url in extras:
                if url.original not in seen:
                    parsed.urls.append(url)
                    url.source = "jira-description"
        return self._analyze_parsed(parsed, errors=errors, ticket_key=ticket_key)

    def analyze_text(self, text: str, *, ticket_key: str | None = None) -> AnalysisReport:
        parsed = ParsedEmail(subject="(no eml attached)", text_body=text)
        parsed.urls = extract_urls(text, "", max_urls=self.settings.max_urls)
        for url in parsed.urls:
            url.source = "jira-description"
        return self._analyze_parsed(parsed, errors=["No .eml attachment; analyzed ticket text only"], ticket_key=ticket_key)

    def _analyze_parsed(
        self,
        parsed: ParsedEmail,
        *,
        errors: list[str],
        ticket_key: str | None,
    ) -> AnalysisReport:
        target = parsed.nested or parsed
        sender = analyze_sender(parsed, self.settings)
        urls = collect_urls(parsed, max_urls=self.settings.max_urls)
        urls = MimecastAgent(self.mimecast).decode_urls(urls, errors)
        # Recompute display mismatch against decoded destinations.
        for url in urls:
            if url.decoded and url.display_text:
                url.display_mismatch = url.display_mismatch or href_text_mismatch(
                    url.decoded, url.display_text
                )

        report = AnalysisReport(
            email=target,
            sender=sender,
            urls=urls,
            errors=errors,
            ticket_key=ticket_key,
        )
        report.intel.extend(
            VirusTotalAgent(self.virustotal).enrich(
                urls, sender, target.attachments, errors
            )
        )
        report.intel.extend(UrlscanAgent(self.urlscan).enrich(urls, errors))
        mimecast_msg = MimecastAgent(self.mimecast).message_intel(parsed, errors)
        if mimecast_msg:
            report.intel.append(mimecast_msg)

        ai = self.verdict_agent.run(report)
        report.verdict = ai.verdict
        report.confidence = ai.confidence
        report.summary = ai.summary
        report.rationale = ai.rationale
        report.recommended_actions = ai.recommended_actions
        report.iocs = ai.iocs or report.iocs
        report.verdict_source = ai.source
        if not report.iocs:
            from phishintel.agents.verdict import _iocs

            report.iocs = _iocs(report)
        return report
