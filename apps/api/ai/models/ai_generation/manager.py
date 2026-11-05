"""Filter compositions and writes for the ai generation table."""

from ai.models.ai_generation.queryset import AIGenerationQuerySet
from core.managers import BaseManager


class AIGenerationManager(BaseManager.from_queryset(AIGenerationQuerySet)):
    """Lookups over generation records."""
