from fastapi.testclient import TestClient

from phishintel import server
from phishintel.config import Settings


def test_health_and_webhook_secret(monkeypatch):
    settings = Settings(
        jira_webhook_secret="s3cret",
        jira_base_url="",
        jira_email="",
        jira_api_token="",
    )
    monkeypatch.setattr(server, "_settings", settings)
    client = TestClient(server.app)
    assert client.get("/health").json()["ok"] is True

    response = client.post("/hooks/jira", json={"issue": {"key": "PHISH-1"}})
    assert response.status_code == 401

    response = client.post(
        "/hooks/jira",
        json={"webhookEvent": "comment_created", "issue": {"key": "PHISH-1"}},
        headers={"X-Phishintel-Secret": "s3cret"},
    )
    assert response.status_code == 200
    assert response.json()["skipped"] == "comment_created"


def test_jira_comment_and_attachment_helpers():
    from phishintel.agents.jira import already_analyzed, find_eml_attachments

    issue = {
        "fields": {
            "labels": [],
            "attachment": [
                {
                    "filename": "screenshot.png",
                    "mimeType": "image/png",
                    "size": 10,
                    "content": "http://x/1",
                },
                {
                    "filename": "report.eml",
                    "mimeType": "message/rfc822",
                    "size": 200,
                    "content": "http://x/2",
                },
            ],
            "comment": {"comments": []},
        }
    }
    found = find_eml_attachments(issue)
    assert len(found) == 1
    assert found[0]["filename"] == "report.eml"
    assert already_analyzed(issue, "phishintel-analyzed") is False
    issue["fields"]["labels"] = ["phishintel-analyzed"]
    assert already_analyzed(issue, "phishintel-analyzed") is True
