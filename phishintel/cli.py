from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

from phishintel.agents.jira import JiraClient
from phishintel.config import Settings, get_settings
from phishintel.ingest import analyze_jira_issue, poll_jira
from phishintel.pipeline import PhishPipeline
from phishintel.reporting.jira_comment import wiki_comment


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="phishintel",
        description="Phishing email analysis agents for Jira-reported .eml files",
    )
    sub = parser.add_subparsers(dest="cmd", required=True)

    analyze = sub.add_parser("analyze", help="Analyze a local .eml file")
    analyze.add_argument("eml", type=Path)
    analyze.add_argument("-o", "--output", type=Path, help="Write JSON report")
    analyze.add_argument("--wiki", action="store_true", help="Print Jira wiki markup")

    jira_cmd = sub.add_parser("jira", help="Analyze .eml attachments on a Jira issue")
    jira_cmd.add_argument("issue_key")
    jira_cmd.add_argument("--force", action="store_true")
    jira_cmd.add_argument("-o", "--output", type=Path)

    poll = sub.add_parser("poll", help="Poll Jira JQL and analyze new tickets")
    poll.add_argument("--once", action="store_true")
    poll.add_argument("--interval", type=int, default=None)

    sub.add_parser("serve", help="Run the Jira webhook server")

    args = parser.parse_args(argv)
    settings = get_settings()

    if args.cmd == "analyze":
        return _analyze_file(args.eml, args.output, args.wiki, settings)
    if args.cmd == "jira":
        return _analyze_jira(args.issue_key, args.force, args.output, settings)
    if args.cmd == "poll":
        return _poll(settings, once=args.once, interval=args.interval)
    if args.cmd == "serve":
        from phishintel.server import run_server

        run_server(settings)
        return 0
    parser.error(f"unknown command {args.cmd}")
    return 2


def _analyze_file(path: Path, output: Path | None, wiki: bool, settings: Settings) -> int:
    data = path.read_bytes()
    with PhishPipeline(settings) as pipeline:
        report = pipeline.analyze_eml(data)
    _emit(report, output, wiki)
    return 0


def _analyze_jira(key: str, force: bool, output: Path | None, settings: Settings) -> int:
    if not settings.jira_enabled():
        print("Jira is not configured. Set JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN.", file=sys.stderr)
        return 2
    with PhishPipeline(settings) as pipeline:
        jira = JiraClient(settings)
        try:
            report = analyze_jira_issue(
                key, settings=settings, pipeline=pipeline, jira=jira, force=force
            )
        finally:
            jira.close()
    _emit(report, output, wiki=False)
    print(f"Posted analysis to {key} ({report.verdict.value})", file=sys.stderr)
    return 0


def _poll(settings: Settings, *, once: bool, interval: int | None) -> int:
    if not settings.jira_enabled():
        print("Jira is not configured.", file=sys.stderr)
        return 2
    wait = interval or settings.poll_interval_seconds
    with PhishPipeline(settings) as pipeline:
        jira = JiraClient(settings)
        try:
            while True:
                keys = poll_jira(settings, pipeline, jira)
                print(f"processed {len(keys)} issue(s): {', '.join(keys) or '-'}", file=sys.stderr)
                if once:
                    return 0
                time.sleep(wait)
        finally:
            jira.close()


def _emit(report, output: Path | None, wiki: bool) -> None:
    payload = report.model_dump(mode="json")
    text = wiki_comment(report) if wiki else json.dumps(payload, indent=2)
    if output:
        output.write_text(text if wiki else json.dumps(payload, indent=2), encoding="utf-8")
    print(text)


if __name__ == "__main__":
    raise SystemExit(main())
