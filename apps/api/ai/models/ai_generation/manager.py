"""Filter compositions and writes for the ai generation table."""

from ai.models.ai_generation.queryset import AIGenerationQuerySet
from core.managers import BaseManager


class AIGenerationManager(BaseManager.from_queryset(AIGenerationQuerySet)):
    """Lookups over generation records."""

    def list_for_job(self, job_id: str) -> AIGenerationQuerySet:
        """Returns the generations recorded against a job, oldest first."""
        return self.filter_job_ids([job_id])
