from django.apps import AppConfig


class CoreConfig(AppConfig):
    """Shared plumbing: fields, errors, permissions and the Postgres enum types."""

    name = "core"
