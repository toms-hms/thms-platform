"""AI visualisations generated from a job's source image."""

from typing import Any

from ai.clients.openai_client import OpenAIClient
from ai.models import AIGeneration, AIGenerationStatus, JobImage, JobImageKind
from ai.models.ai_generation.manager import AIGenerationManager
from ai.models.job_image.manager import JobImageManager
from ai.utils.prompt_utils import IMAGE_MODEL, visualisation_prompt
from core.errors import NotFoundError
from core.services.storage_service import StorageService


class ImageGenerationService:
    """Generates an image, stores it as a job image and records the generation."""

    def __init__(
        self,
        *,
        openai: OpenAIClient | None = None,
        storage_service: StorageService | None = None,
        ai_generation_manager: AIGenerationManager | None = None,
        job_image_manager: JobImageManager | None = None,
    ) -> None:
        self._openai = openai or OpenAIClient()
        self._storage_service = storage_service or StorageService()
        self._ai_generation_manager = ai_generation_manager or AIGeneration.objects
        self._job_image_manager = job_image_manager or JobImage.objects

    def generate(
        self,
        *,
        job_id: str,
        user_id: str,
        source_image_id: str,
        prompt: str,
        provider: str = "openai",
        metadata: dict[str, Any] | None = None,
    ) -> AIGeneration:
        """Returns the completed generation. On any failure the generation is marked FAILED and the error re-raised."""
        source_image = self._job_image_manager.find(pk=source_image_id)
        if source_image is None:
            raise NotFoundError("Source image")

        generation = self._ai_generation_manager.create(
            job_id=job_id,
            original_image_url=self._storage_service.download_url(key=source_image.storage_key),
            prompt=prompt,
            provider=provider,
            status=AIGenerationStatus.PROCESSING,
            metadata=metadata,
            created_by_id=user_id,
        )
        try:
            image_bytes = self._openai.generate_image(model=IMAGE_MODEL, prompt=visualisation_prompt(prompt))
            key = self._storage_service.job_file_key(job_id=job_id, folder="generated", extension="png")
            self._storage_service.put(key=key, body=image_bytes, content_type="image/png")
            self._job_image_manager.create(
                job_id=job_id,
                storage_key=key,
                kind=JobImageKind.GENERATED,
                label=f"AI Generated: {prompt[:50]}",
                ai_generation=generation,
                uploaded_by_id=user_id,
            )
            return self._ai_generation_manager.apply_updates(
                generation,
                generated_image_url=self._storage_service.download_url(key=key),
                status=AIGenerationStatus.COMPLETED,
            )
        except Exception:
            self._ai_generation_manager.apply_updates(generation, status=AIGenerationStatus.FAILED)
            raise
