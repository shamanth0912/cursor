from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    org_domains: str = ""
    org_brands: str = (
        "microsoft,google,apple,paypal,amazon,okta,docusign,adobe,zoom,"
        "salesforce,linkedin,dropbox,github,atlassian,mimecast"
    )

    jira_base_url: str = ""
    jira_email: str = ""
    jira_api_token: str = ""
    jira_jql: str = (
        "project = PHISH AND labels != phishintel-analyzed AND attachments is not EMPTY"
    )
    jira_analyzed_label: str = "phishintel-analyzed"
    jira_verdict_field: str = ""
    jira_webhook_secret: str = ""

    virustotal_api_key: str = ""
    virustotal_submit_unknown: bool = False
    virustotal_upload_attachments: bool = False

    urlscan_api_key: str = ""
    urlscan_visibility: str = "private"
    urlscan_submit: bool = True
    urlscan_poll_timeout_seconds: int = 45

    mimecast_client_id: str = ""
    mimecast_client_secret: str = ""
    mimecast_base_url: str = "https://api.services.mimecast.com"
    mimecast_access_key: str = ""
    mimecast_secret_key: str = ""
    mimecast_app_id: str = ""
    mimecast_app_key: str = ""
    mimecast_api1_base_url: str = "https://us-api.mimecast.com"
    mimecast_lookup_message: bool = True
    mimecast_lookup_click_logs: bool = False

    openai_api_key: str = ""
    openai_base_url: str = "https://api.openai.com/v1"
    openai_model: str = "gpt-4o-mini"
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-20250514"

    max_urls: int = 15
    host: str = "0.0.0.0"
    port: int = 8080
    poll_interval_seconds: int = 60
    http_timeout_seconds: float = 30.0

    def org_domain_list(self) -> list[str]:
        return _csv(self.org_domains)

    def org_brand_list(self) -> list[str]:
        return _csv(self.org_brands)

    def mimecast_oauth_enabled(self) -> bool:
        return bool(self.mimecast_client_id and self.mimecast_client_secret)

    def mimecast_hmac_enabled(self) -> bool:
        return bool(
            self.mimecast_access_key
            and self.mimecast_secret_key
            and self.mimecast_app_id
            and self.mimecast_app_key
        )

    def mimecast_enabled(self) -> bool:
        return self.mimecast_oauth_enabled() or self.mimecast_hmac_enabled()

    def jira_enabled(self) -> bool:
        return bool(self.jira_base_url and self.jira_email and self.jira_api_token)


def _csv(value: str) -> list[str]:
    return [part.strip().lower() for part in value.split(",") if part.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
