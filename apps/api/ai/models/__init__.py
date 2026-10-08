"""The ai app's models. Each lives in models/<name>/ with its queryset and manager."""

from ai.models.ai_generation.model import AIGeneration, AIGenerationStatus
from ai.models.job_image.model import JobImage, JobImageKind

__all__ = [
    "AIGenerationStatus",
    "AIGeneration",
    "JobImageKind",
    "JobImage",
]
