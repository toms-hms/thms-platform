from django.apps import AppConfig


class CoreConfig(AppConfig):
    """Shared plumbing: querysets, managers, errors, permissions and GraphQL helpers."""

    name = "core"

    def ready(self) -> None:
        """Registers the GraphQL field converters before any schema type is built."""
        from core import converters  # noqa: F401
