"""Django settings for the THMS API.

Configuration comes from the environment — see `.env.example`. Anything secret
(JWT keys, OAuth client secrets, the encryption key) must come from the
environment, never from this file.
"""

import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / ".env.test" if os.environ.get("DJANGO_ENV") == "test" else BASE_DIR / ".env")


def env(key: str, default: str | None = None, *, required: bool = False) -> str:
    """Returns the environment variable, falling back to default; raises when a required key is missing."""
    value = os.environ.get(key, default)
    if required and not value:
        raise RuntimeError(f"Missing required environment variable: {key}")
    return value or ""


def env_bool(key: str, default: bool = False) -> bool:
    """Returns the environment variable parsed as a boolean ('true'/'1' are true)."""
    return os.environ.get(key, str(default)).lower() in {"true", "1", "yes"}


DJANGO_ENV = env("DJANGO_ENV", "development")
DEBUG = DJANGO_ENV == "development"
TESTING = DJANGO_ENV == "test"

SECRET_KEY = env("DJANGO_SECRET_KEY", "dev-insecure-django-secret-key-change-me")
ALLOWED_HOSTS = [h for h in env("ALLOWED_HOSTS", "*").split(",") if h]

# ── Applications ──────────────────────────────────────────────────────────────

INSTALLED_APPS = [
    "django.contrib.contenttypes",
    "django.contrib.postgres",
    "django.contrib.staticfiles",
    "corsheaders",
    "graphene_django",
    "auditlog",
    "core",
    "accounts",
    "homes",
    "contractors",
    "user_contractors",
    "jobs",
    "quotes",
    "communications",
    "ai",
    "integrations",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.middleware.common.CommonMiddleware",
    # Resolves the Bearer token into request.user before auditlog reads the actor.
    "core.middleware.JWTAuthenticationMiddleware",
    "auditlog.middleware.AuditlogMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {"context_processors": []},
    },
]

# ── Database ──────────────────────────────────────────────────────────────────
# The schema predates Django: tables are PascalCase, columns camelCase, primary
# keys are CUID2 strings and enums are native Postgres types. Models map onto it
# explicitly (db_table / db_column) — see .ai/recipes/api/model.md.

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "CONN_MAX_AGE": 0 if TESTING else 60,
        "OPTIONS": {},
    }
}

DATABASE_URL = env("DATABASE_URL", required=not TESTING)
if DATABASE_URL:
    from urllib.parse import unquote, urlparse

    parsed = urlparse(DATABASE_URL)
    DATABASES["default"].update(
        NAME=parsed.path.lstrip("/"),
        USER=unquote(parsed.username or ""),
        PASSWORD=unquote(parsed.password or ""),
        HOST=parsed.hostname or "",
        PORT=str(parsed.port or 5432),
    )

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
AUTH_USER_MODEL = "accounts.User"

# ── Cache (permission checks, rate limiting) ──────────────────────────────────

REDIS_URL = env("REDIS_URL", "redis://localhost:6379")
CACHES = {
    "default": (
        {"BACKEND": "django.core.cache.backends.locmem.LocMemCache", "LOCATION": "thms"}
        if TESTING
        else {"BACKEND": "django.core.cache.backends.redis.RedisCache", "LOCATION": REDIS_URL}
    )
}

# ── Auth / JWT ────────────────────────────────────────────────────────────────

JWT_SECRET = env("JWT_SECRET", "dev-jwt-secret-at-least-32-characters!")
JWT_REFRESH_SECRET = env("JWT_REFRESH_SECRET", "dev-refresh-secret-at-least-32-chars!")
JWT_EXPIRES_IN = env("JWT_EXPIRES_IN", "15m")
JWT_REFRESH_EXPIRES_IN = env("JWT_REFRESH_EXPIRES_IN", "7d")
JWT_ALGORITHM = "HS256"
ENCRYPTION_KEY = env("ENCRYPTION_KEY", "thms-dev-encryptionkey-32chars!!")

# Django's default hashers (PBKDF2 first) in every environment except tests,
# where a fast hasher keeps factory-built users cheap.
if TESTING:
    PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]

# ── Permissions cache ─────────────────────────────────────────────────────────

PERMISSION_CACHE_TIMEOUT = int(env("PERMISSION_CACHE_TIMEOUT", "300"))

# ── Rate limiting ─────────────────────────────────────────────────────────────
# Mirrors the limits the Express API enforced: 500 requests / 15 min overall,
# 20 / 15 min against the auth mutations.

RATELIMIT_ENABLE = not TESTING
GRAPHQL_RATE_LIMIT = env("GRAPHQL_RATE_LIMIT", "500/15m")
AUTH_RATE_LIMIT = env("AUTH_RATE_LIMIT", "20/15m")

# ── CORS / security headers ───────────────────────────────────────────────────

CORS_ORIGIN = env("CORS_ORIGIN", "http://localhost:3000")
CORS_ALLOWED_ORIGINS = [o for o in CORS_ORIGIN.split(",") if o]
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = ["content-type", "authorization"]
CORS_ALLOW_METHODS = ["GET", "POST", "OPTIONS"]

SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "no-referrer"
X_FRAME_OPTIONS = "DENY"
SECURE_CROSS_ORIGIN_OPENER_POLICY = "same-origin"
if DJANGO_ENV == "production":
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

# ── Object storage (MinIO / S3) ───────────────────────────────────────────────

MINIO_ENDPOINT = env("MINIO_ENDPOINT", "localhost")
MINIO_PORT = env("MINIO_PORT", "9000")
MINIO_USE_SSL = env_bool("MINIO_USE_SSL", False)
MINIO_ACCESS_KEY = env("MINIO_ACCESS_KEY", "minioadmin")
MINIO_SECRET_KEY = env("MINIO_SECRET_KEY", "minioadmin")
MINIO_BUCKET = env("MINIO_BUCKET", "thms-uploads")
S3_ENDPOINT_URL = f"{'https' if MINIO_USE_SSL else 'http'}://{MINIO_ENDPOINT}:{MINIO_PORT}"

STORAGES = {
    "default": {
        "BACKEND": "storages.backends.s3.S3Storage",
        "OPTIONS": {
            "bucket_name": MINIO_BUCKET,
            "endpoint_url": S3_ENDPOINT_URL,
            "access_key": MINIO_ACCESS_KEY,
            "secret_key": MINIO_SECRET_KEY,
            "region_name": "us-east-1",
            "addressing_style": "path",
            "signature_version": "s3v4",
            "querystring_expire": 3600,
        },
    },
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}

UPLOAD_URL_EXPIRES_IN = 900
DOWNLOAD_URL_EXPIRES_IN = 3600

# ── Third-party integrations ──────────────────────────────────────────────────

OPENAI_API_KEY = env("OPENAI_API_KEY")
GOOGLE_CLIENT_ID = env("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = env("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = env(
    "GOOGLE_REDIRECT_URI", "http://localhost:3001/api/v1/integrations/email/google/callback"
)
MICROSOFT_CLIENT_ID = env("MICROSOFT_CLIENT_ID")
MICROSOFT_CLIENT_SECRET = env("MICROSOFT_CLIENT_SECRET")
MICROSOFT_TENANT_ID = env("MICROSOFT_TENANT_ID", "common")
MICROSOFT_REDIRECT_URI = env(
    "MICROSOFT_REDIRECT_URI", "http://localhost:3001/api/v1/integrations/email/microsoft/callback"
)

# ── GraphQL ───────────────────────────────────────────────────────────────────

GRAPHENE = {
    "SCHEMA": "config.schema.schema",
    "CAMELCASE_ERRORS": True,
}
GRAPHIQL_ENABLED = env_bool("GRAPHIQL_ENABLED", DEBUG)

# ── Audit log ─────────────────────────────────────────────────────────────────

# Models are registered explicitly in each app's AppConfig.ready() so that
# per-model exclusions (password hashes, encrypted tokens) are declared next to
# the model they protect.
AUDITLOG_INCLUDE_ALL_MODELS = False
AUDITLOG_DISABLE_ON_RAW_SAVE = True

# ── i18n / static ─────────────────────────────────────────────────────────────

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = False
USE_TZ = True
STATIC_URL = "static/"

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": "ERROR" if TESTING else "INFO"},
    "loggers": {"django.db.backends": {"level": "DEBUG" if env_bool("SQL_DEBUG") else "INFO"}},
}
