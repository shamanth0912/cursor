from __future__ import annotations

from phishintel.agents.jira import (
    JiraClient,
    JiraReporterAgent,
    already_analyzed,
    find_eml_attachments,
)
from phishintel.config import Settings
from phishintel.models import AnalysisReport
from phishintel.pipeline import PhishPipeline


def analyze_jira_issue(
    key: str,
    *,
    settings: Settings,
    pipeline: PhishPipeline,
    jira: JiraClient,
    force: bool = False,
) -> AnalysisReport:
    issue = jira.get_issue(key)
    if already_analyzed(issue, settings.jira_analyzed_label) and not force:
        report = AnalysisReport(
            summary=f"{key} already analyzed (label {settings.jira_analyzed_label}). Use --force to re-run.",
            ticket_key=key,
        )
        report.errors.append("skipped-already-analyzed")
        return report

    fields = issue.get("fields") or {}
    extra_text = "\n".join(
        str(part)
        for part in (fields.get("summary"), fields.get("description"))
        if part
    )
    attachments = find_eml_attachments(issue)
    if not attachments:
        report = pipeline.analyze_text(extra_text, ticket_key=key)
    else:
        # Prefer the largest .eml (often the original message vs a stub).
        chosen = max(attachments, key=lambda item: int(item.get("size") or 0))
        content_url = chosen.get("content")
        if not content_url:
            raise RuntimeError(f"{key}: attachment {chosen.get('filename')} has no content URL")
        eml = jira.download_attachment(content_url)
        report = pipeline.analyze_eml(eml, extra_text=extra_text, ticket_key=key)

    JiraReporterAgent(jira).publish(key, report)
    return report


def poll_jira(settings: Settings, pipeline: PhishPipeline, jira: JiraClient) -> list[str]:
    processed: list[str] = []
    for issue in jira.search(settings.jira_jql):
        key = issue.get("key")
        if not key:
            continue
        analyze_jira_issue(key, settings=settings, pipeline=pipeline, jira=jira)
        processed.append(key)
    return processed
