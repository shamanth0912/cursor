# PhishIntel

Multi-agent phishing email analysis for org users who report suspicious mail in **Jira**.

The analyzer:

1. Pulls the ticket and downloads `.eml` attachments (including nested `message/rfc822` forwards)
2. Parses headers, sender identity, SPF/DKIM/DMARC, attachments, and URLs
3. Unwraps **Mimecast URL Protect**, Microsoft Safe Links, and Proofpoint wrappers
4. Decodes Mimecast links via the Mimecast API (OAuth 2.0 or API 1.0 HMAC)
5. Looks up destinations, sender domains, originating IPs, and attachment hashes in **VirusTotal** and **urlscan.io**
6. Produces an **AI verdict** (OpenAI or Anthropic, with a heuristic fallback)
7. Posts a structured comment, labels (`phish-malicious` / `phish-suspicious` / `phish-benign` / `phish-inconclusive`), and a JSON report back to the Jira ticket

```
Jira ticket (.eml)
        │
        ▼
 ┌──────────────┐     ┌─────────────┐     ┌──────────────┐
 │ Parse agent  │────▶│ Sender agent│────▶│ URL agent    │
 │ headers/body │     │ auth/spoof  │     │ unwrap links │
 └──────────────┘     └─────────────┘     └──────┬───────┘
                                                 │
                    ┌────────────────────────────┼────────────────────────────┐
                    ▼                            ▼                            ▼
            Mimecast agent               VirusTotal agent              urlscan agent
            decode + message             URL/domain/IP/hash            search + private scan
                    │                            │                            │
                    └────────────────────────────┼────────────────────────────┘
                                                 ▼
                                          Verdict agent
                                          (LLM + heuristics)
                                                 ▼
                                          Jira reporter
                                          comment + labels
```

## Quick start

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env   # fill in API keys

# Local .eml (no Jira required)
phishintel analyze tests/fixtures/phishing_mimecast.eml --wiki

# Analyze a Jira ticket and post the verdict
phishintel jira PHISH-123

# Poll JQL for new reports
phishintel poll --once

# Jira webhook listener
phishintel serve
```

## Jira setup

1. Create a project (for example `PHISH`) where users file reports and attach the original `.eml`.
2. Create a Jira API token for a bot account that can read issues, add comments, add labels, and add attachments.
3. Add a webhook (Jira settings → System → Webhooks) for **Issue created** and **Issue updated**:
   - URL: `https://<your-host>/hooks/jira`
   - Header: `X-Phishintel-Secret: <JIRA_WEBHOOK_SECRET>`
4. Optional: a custom field (`JIRA_VERDICT_FIELD=customfield_xxxxx`) to store the verdict string.

Users should attach the original message as `.eml` (Outlook: File → Save as → Outlook Message Format / or drag from the client). Forwarded reports with the original as an attached message are also parsed.

Default search used by `phishintel poll`:

```
project = PHISH AND labels != phishintel-analyzed AND attachments is not EMPTY
```

Override with `JIRA_JQL`.

## API keys

| Service | Env vars | What it is used for |
|---|---|---|
| Jira | `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN` | Read tickets, download `.eml`, post verdict |
| Mimecast API 2.0 | `MIMECAST_CLIENT_ID`, `MIMECAST_CLIENT_SECRET` | Decode rewritten URLs, optional message-finder |
| Mimecast API 1.0 | `MIMECAST_ACCESS_KEY`, `MIMECAST_SECRET_KEY`, `MIMECAST_APP_ID`, `MIMECAST_APP_KEY` | Same, HMAC fallback |
| VirusTotal | `VIRUSTOTAL_API_KEY` | URL, domain, IP, file-hash reputation |
| urlscan.io | `URLSCAN_API_KEY` | Search existing scans; optional private submit |
| OpenAI-compatible | `OPENAI_API_KEY`, `OPENAI_MODEL` | AI verdict |
| Anthropic | `ANTHROPIC_API_KEY` | AI verdict (preferred if both are set) |

If no LLM key is set, a deterministic heuristic verdict still runs from auth failures, lookalikes, URL mismatches, and intel detections.

**Mimecast:** register an API application in the Mimecast administration console. API 2.0 (OAuth client credentials) is preferred. The decode endpoint is `POST /api/ttp/url/decode-url`. Set `MIMECAST_API1_BASE_URL` to your grid (`https://us-api.mimecast.com`, `https://eu-api.mimecast.com`, …) if you use API 1.0.

**urlscan:** keep `URLSCAN_VISIBILITY=private` so reported destinations are not published. Internal/RFC1918 URLs are never submitted.

**VirusTotal:** lookups are hash/URL/domain only by default. Set `VIRUSTOTAL_SUBMIT_UNKNOWN=true` to submit unseen URLs. Attachment **upload** is off (`VIRUSTOTAL_UPLOAD_ATTACHMENTS=false`) so internal mail is not shared.

## Agents

| Agent | Role |
|---|---|
| Parse | `.eml` → headers, bodies, nested RFC822, attachment hashes |
| Sender | From vs Return-Path vs Reply-To, SPF/DKIM/DMARC, lookalike/homoglyph domains, originating IP |
| URL | Extract hrefs, detect display-text mismatch, unwrap Safe Links / Proofpoint, flag Mimecast wrappers |
| Mimecast | Decode URL Protect links; optional message-finder by `Message-ID` |
| VirusTotal | Reputation for decoded URLs, domains, sender IP, attachment SHA256 |
| urlscan | Search, then private scan if needed |
| Verdict | LLM JSON verdict with heuristic fallback |
| Jira reporter | Wiki comment, labels, optional custom field, `phishintel-report.json` |

## Safety

- The analyzer does **not** fetch phishing sites itself. Scanning is delegated to VirusTotal, urlscan.io, and Mimecast.
- Mimecast/Safe Links wrapper hosts are not treated as the malicious destination.
- Re-analysis is skipped when the ticket already has `phishintel-analyzed` (use `phishintel jira KEY --force`).

## Docker

```bash
docker build -t phishintel .
docker run --env-file .env -p 8080:8080 phishintel
```

## Tests

```bash
pip install -e ".[dev]"
pytest
```
