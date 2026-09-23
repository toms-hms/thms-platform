# Production image: gunicorn, no dev dependencies, no source mount.
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    DJANGO_ENV=production \
    UV_PROJECT_ENVIRONMENT=/usr/local

RUN apt-get update -y \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

COPY apps/api/pyproject.toml apps/api/uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

COPY apps/api/ ./

RUN useradd --create-home --uid 1001 thms && chown -R thms:thms /app
USER thms

EXPOSE 3001

CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:3001", "--workers", "4", "--timeout", "120"]
