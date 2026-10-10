"""Test factories for the ai app, one module per model."""

from ai.factories.ai_generation_factory import AIGenerationFactory
from ai.factories.job_image_factory import JobImageFactory

__all__ = [
    "AIGenerationFactory",
    "JobImageFactory",
]
