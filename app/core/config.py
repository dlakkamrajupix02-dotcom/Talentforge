from functools import cached_property
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from dotenv import load_dotenv

# Loads .env file into environment variables BEFORE Settings reads them

load_dotenv()

# Lexy display names exposed to frontend -> provider model IDs used for AI calls
LEXY_TO_PROVIDER: dict[str, str] = {
    "phenomecloud-code": "codestral-latest",
    "phenomecloud-small": "mistral-small-latest",
    "phenomecloud-dev": "devstral-latest",
    "phenomecloud-dev-medium": "devstral-medium-latest",
    "phenomecloud-reasoning": "magistral-medium-latest",
    "phenomecloud-14b": "ministral-14b-latest",
    "lexy-3b": "ministral-3b-latest",
    "lexy-8b": "ministral-8b-latest",
    "lexy-large": "mistral-large-latest",
    "lexy-medium": "mistral-medium-latest",
    "lexy-tiny": "mistral-tiny-latest",
    "lexy-vibe": "mistral-vibe-cli-latest",
    "lexy-medium-2505": "mistral-medium-2505",
    "lexy-dev-2512": "devstral-2512",
    "lexy-lean-2603": "labs-leanstral-2603",
    "lexy-large-2512": "mistral-large-2512",
    "lexy-medium-3-5": "mistral-medium-3-5",
    "lexy-medium-35": "mistral-medium-3.5",
    "lexy-medium-3": "mistral-medium-3",
    "lexy-medium-2604": "mistral-medium-2604",
    "lexy-medium-c21211": "mistral-medium-c21211-r0-75",
}


class Settings(BaseSettings):

    database_url: str = Field(..., alias="DB_URL")
    secret_key: str = Field(..., alias="SECRET_KEY")
    algorithm: str = Field(..., alias="ALGORITHM")
    access_token_expire_minutes: int = Field(..., alias="ACCESS_TOKEN_EXPIRE_MINUTES")
    max_sections_limit: int = Field(20, alias="MAX_SECTIONS_LIMIT")

    db_max_retries: int = Field(..., alias="DB_MAX_RETRIES")
    db_retry_delay: float = Field(..., alias="DB_RETRY_DELAY")
    db_retry_max_delay: float = Field(..., alias="DB_RETRY_MAX_DELAY")
    db_retry_backoff: float = Field(2.0, alias="DB_RETRY_BACKOFF")
    db_retry_jitter: bool = Field(True, alias="DB_RETRY_JITTER")

    # DB circuit breaker (infra failures only; optional env overrides)
    db_circuit_enabled: bool = Field(True, alias="DB_CIRCUIT_ENABLED")
    db_circuit_failure_threshold: int = Field(25, alias="DB_CIRCUIT_FAILURE_THRESHOLD")
    db_circuit_reset_seconds: int = Field(30, alias="DB_CIRCUIT_RESET_SECONDS")
    db_circuit_success_threshold: int = Field(2, alias="DB_CIRCUIT_SUCCESS_THRESHOLD")

    # AI Provider Configuration (OpenRouter, NVIDIA, etc.)
    ai_api_key: str = Field(..., alias="AI_API_KEY")
    ai_base_url: str = Field(..., alias="AI_BASE_URL")
    ai_model: str = Field(..., alias="AI_MODEL")
    ai_max_tokens: int = Field(..., alias="AI_MAX_TOKENS")

    # AI timeout settings (in seconds)
    ai_timeout_read: float = Field(120.0, alias="AI_TIMEOUT_READ")

    # AI retry settings
    ai_retry_attempts: int = Field(3, alias="AI_RETRY_ATTEMPTS")
    ai_retry_multiplier: float = Field(1.0, alias="AI_RETRY_MULTIPLIER")
    ai_retry_min: float = Field(0.25, alias="AI_RETRY_MIN")
    ai_retry_max: float = Field(4.0, alias="AI_RETRY_MAX")

    # AI Generation Settings
    ai_temperature: float = Field(0.15, alias="AI_TEMPERATURE")
    ai_top_p: float = Field(0.92, alias="AI_TOP_P")
    
    # Available AI Models (comma-separated list for frontend)
    ai_available_models: str = Field("codestral-latest,mistral-small-latest,devstral-latest,devstral-medium-latest,magistral-medium-latest,ministral-14b-latest,ministral-3b-latest,ministral-8b-latest,mistral-large-latest,mistral-medium-latest,mistral-tiny-latest,mistral-vibe-cli-latest,mistral-medium-2505,devstral-2512,labs-leanstral-2603,mistral-large-2512,mistral-medium-3-5,mistral-medium-3.5,mistral-medium-3,mistral-medium-2604,mistral-medium-c21211-r0-75", alias="AI_AVAILABLE_MODELS")

     


    google_oauth_client_id: str | None = Field(None, alias="GOOGLE_OAUTH_CLIENT_ID")
    google_oauth_client_secret: str | None = Field(None, alias="GOOGLE_OAUTH_CLIENT_SECRET")
    google_auth_url: str | None = Field(None, alias="GOOGLE_AUTH_URL")
    google_token_url: str | None = Field(None, alias="GOOGLE_TOKEN_URL")
    google_userinfo_url: str | None = Field(None, alias="GOOGLE_USERINFO_URL")
    google_redirect_uri: str | None = Field(None, alias="GOOGLE_REDIRECT_URI")
    google_oauth_scopes: str | None = Field(None, alias="GOOGLE_OAUTH_SCOPES")

    microsoft_oauth_client_id: str | None = Field(None, alias="MICROSOFT_OAUTH_CLIENT_ID")
    microsoft_oauth_client_secret: str | None = Field(None, alias="MICROSOFT_OAUTH_CLIENT_SECRET")
    microsoft_oauth_auth_url: str | None = Field(None, alias="MICROSOFT_OAUTH_AUTH_URL")
    microsoft_oauth_token_url: str | None = Field(None, alias="MICROSOFT_OAUTH_TOKEN_URL")
    microsoft_oauth_userinfo_url: str | None = Field(None, alias="MICROSOFT_OAUTH_USERINFO_URL")
    microsoft_oauth_redirect_uri: str | None = Field(None, alias="MICROSOFT_OAUTH_REDIRECT_URI")
    microsoft_oauth_scopes: str | None = Field(None, alias="MICROSOFT_OAUTH_SCOPES")

    cornerstone_oauth_client_id: str | None = Field(None, alias="CORNERSTONE_OAUTH_CLIENT_ID")
    cornerstone_oauth_client_secret: str | None = Field(None, alias="CORNERSTONE_OAUTH_CLIENT_SECRET")
    cornerstone_oauth_auth_url: str | None = Field(None, alias="CORNERSTONE_OAUTH_AUTH_URL")
    cornerstone_oauth_token_url: str | None = Field(None, alias="CORNERSTONE_OAUTH_TOKEN_URL")
    cornerstone_oauth_userinfo_url: str | None = Field(None, alias="CORNERSTONE_OAUTH_USERINFO_URL")
    cornerstone_oauth_redirect_uri: str | None = Field(None, alias="CORNERSTONE_OAUTH_REDIRECT_URI")
    cornerstone_oauth_scopes: str | None = Field(None, alias="CORNERSTONE_OAUTH_SCOPES")

    linkedin_oauth_client_id: str | None = Field(None, alias="LINKEDIN_OAUTH_CLIENT_ID")
    linkedin_oauth_client_secret: str | None = Field(None, alias="LINKEDIN_OAUTH_CLIENT_SECRET")
    linkedin_oauth_auth_url: str | None = Field(None, alias="LINKEDIN_OAUTH_AUTH_URL")
    linkedin_oauth_token_url: str | None = Field(None, alias="LINKEDIN_OAUTH_TOKEN_URL")
    linkedin_oauth_userinfo_url: str | None = Field(None, alias="LINKEDIN_OAUTH_USERINFO_URL")
    linkedin_oauth_email_url: str | None = Field(None, alias="LINKEDIN_OAUTH_EMAIL_URL")
    linkedin_oauth_redirect_uri: str | None = Field(None, alias="LINKEDIN_OAUTH_REDIRECT_URI")
    linkedin_oauth_scopes: str | None = Field(None, alias="LINKEDIN_OAUTH_SCOPES")


    # Email Configuration for OTP
    smtp_server: str = Field("smtp.gmail.com", alias="SMTP_SERVER")
    smtp_port: int = Field(587, alias="SMTP_PORT")
    smtp_email: str = Field(..., alias="SMTP_EMAIL")
    smtp_password: str = Field(..., alias="SMTP_PASSWORD")
    support_email: str = Field("talentforge.phenomecloud.support@gmail.com", alias="SUPPORT_EMAIL")
    feedback_notify_email: str = Field("", alias="FEEDBACK_NOTIFY_EMAIL")
    feedback_cooldown_days: int = Field(7, alias="FEEDBACK_COOLDOWN_DAYS")
    feedback_submit_cooldown_days: int = Field(30, alias="FEEDBACK_SUBMIT_COOLDOWN_DAYS")
    feedback_min_sessions: int = Field(3, alias="FEEDBACK_MIN_SESSIONS")
    feedback_min_actions: int = Field(2, alias="FEEDBACK_MIN_ACTIONS")


    # OTP Configuration - OPTIMIZED FOR HIGH LOAD
    otp_expiry_minutes: int = Field(5, alias="OTP_EXPIRY_MINUTES")
    otp_max_attempts: int = Field(3, alias="OTP_MAX_ATTEMPTS")
    otp_resend_cooldown_seconds: int = Field(60, alias="OTP_RESEND_COOLDOWN_SECONDS")


    # Cache Configuration - REDIS FOR 1000 USERS
    redis_url: str = Field("redis://localhost:6380/0", alias="REDIS_URL")
    redis_key_prefix: str = Field("talentforge:v1", alias="REDIS_KEY_PREFIX")
    cache_ttl_minutes: int = Field(5, alias="CACHE_TTL_MINUTES")
    cache_max_size: int = Field(10000, alias="CACHE_MAX_SIZE")


    # Performance Configuration - FOR 1000 CONCURRENT USERS
    max_concurrent_requests: int = Field(1000, alias="MAX_CONCURRENT_REQUESTS")
    request_timeout_seconds: int = Field(900, alias="REQUEST_TIMEOUT_SECONDS")

    # Logging Configuration - PRODUCTION READY
    log_level: str = Field("INFO", alias="LOG_LEVEL")
    log_tracebacks: bool = Field(False, alias="LOG_TRACEBACKS")

    # Security toggles - PRODUCTION DEFAULTS (require explicit opt-in for debug/docs)
    enable_debug_endpoints: bool = Field(False, alias="ENABLE_DEBUG_ENDPOINTS")
    enable_api_docs: bool = Field(False, alias="ENABLE_API_DOCS")
    trusted_hosts: str = Field("", alias="TRUSTED_HOSTS")  # Empty = no trusted host restriction (use behind reverse proxy)
    enforce_https_redirect: bool = Field(False, alias="ENFORCE_HTTPS_REDIRECT")  # Enable in production behind reverse proxy


    # Allowed browser origins — comma-separated. Defaults cover all known clients.
    cors_origins: str = Field("", alias="CORS_ORIGINS")

    frontend_url: str = Field("http://localhost:5173", alias="FRONTEND_URL")


    # Local dev only: set to e.g. "India" to skip geo-lookup on localhost.
    # Leave blank (default) in production — real IP geo-lookup takes over.
    country_override: str = Field("", alias="COUNTRY_OVERRIDE")

    # CSOD defaults / encryption
    csod_default_scope: str = Field(..., alias="CSOD_SCOPES")
    csod_encryption_key: str | None = Field(None, alias="CSOD_ENCRYPTION_KEY")
    require_csod_encryption_key: bool = Field(False, alias="REQUIRE_CSOD_ENCRYPTION_KEY")

    # Application environment — use "production" in deployed environments
    app_env: str = Field("development", alias="APP_ENV")

    # When false, skip Base.metadata.create_all on startup (production should use Alembic only)
    enable_db_create_all: bool = Field(True, alias="ENABLE_DB_CREATE_ALL")

    # Comma-separated proxy IPs/CIDRs that may set X-Forwarded-For (empty = direct connection only)
    trusted_proxy_ips: str = Field("", alias="TRUSTED_PROXY_IPS")

    # WebSocket JWT required on /notifications/ws in all environments
    websocket_require_token: bool = Field(True, alias="WEBSOCKET_REQUIRE_TOKEN")

    # Required secret to bootstrap the first Super Admin (prevents public takeover)
    super_admin_bootstrap_secret: str | None = Field(None, alias="SUPER_ADMIN_BOOTSTRAP_SECRET")

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def trusted_hosts_list(self) -> list[str]:
        return [h.strip() for h in self.trusted_hosts.split(",") if h.strip()]

    @property
    def trusted_proxy_ips_list(self) -> list[str]:
        return [p.strip() for p in self.trusted_proxy_ips.split(",") if p.strip()]

    @property
    def is_production(self) -> bool:
        return self.app_env.strip().lower() == "production"

    @property
    def websocket_require_token_effective(self) -> bool:
        """JWT is always required on WebSocket connections."""
        return bool(self.websocket_require_token)

    @property
    def available_models_list(self) -> list[str]:
        """Provider model IDs allowed for AI calls (from env)."""
        return [m.strip() for m in self.ai_available_models.split(",") if m.strip()]

    @cached_property
    def provider_to_lexy(self) -> dict[str, str]:
        return {provider: lexy for lexy, provider in LEXY_TO_PROVIDER.items()}

    @cached_property
    def available_provider_set(self) -> frozenset[str]:
        return frozenset(self.available_models_list)

    @cached_property
    def available_lexy_models_list(self) -> list[str]:
        p2l = self.provider_to_lexy
        return [p2l[p] for p in self.available_models_list if p in p2l]

    @cached_property
    def default_lexy_model_name(self) -> str:
        return self.provider_to_lexy.get(self.ai_model, self.ai_model)

    def resolve_generation_model(self, name: str | None) -> tuple[str, str]:
        """Resolve frontend model name to (lexy_display_name, provider_model_id)."""
        requested = name or self.default_lexy_model_name
        provider = LEXY_TO_PROVIDER.get(requested)
        if provider and provider in self.available_provider_set:
            return requested, provider
        if requested in self.available_provider_set:
            return self.provider_to_lexy.get(requested, requested), requested
        raise ValueError(requested)
    

settings = Settings()

