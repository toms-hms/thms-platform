"""The integrations app's models. Each lives in models/<name>/ with its queryset and manager."""

from integrations.models.integration.model import Integration, IntegrationProvider, IntegrationType

__all__ = [
    "IntegrationType",
    "IntegrationProvider",
    "Integration",
]
