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
        ai_generation_manager: AIGenerationManager | None = None,
        job_image_manager: JobImageManager | None = None,
        openai: OpenAIClient | None = None,
        storage_service: StorageService | None = None,
    ) -> None:
        self._ai_generation_manager = ai_generation_manager or AIGeneration.objects
        self._job_image_manager = job_image_manager or JobImage.objects
        self._openai = openai or OpenAIClient()
        self._storage_service = storage_service or StorageService()

    def generate(
        self,
        *,
        job_id: str,
        source_image_id: str,
        user_id: str,
        prompt: str,
        metadata: dict[str, Any] | None = None,
        provider: str = "openai",
    ) -> AIGeneration:
        """Returns the completed generation. On any failure the generation is marked FAILED and the error re-raised."""
        source_image = self._job_image_manager.find(pk=source_image_id)
        if source_image is None:
            raise NotFoundError("Source image")

        generation = self._ai_generation_manager.create(
            created_by_id=user_id,
            job_id=job_id,
            metadata=metadata,
            original_image_url=self._storage_service.download_url(key=source_image.storage_key),
            prompt=prompt,
            provider=provider,
            status=AIGenerationStatus.PROCESSING,
        )
        try:
            image_bytes = self._openai.generate_image(model=IMAGE_MODEL, prompt=visualisation_prompt(prompt))
            key = self._storage_service.job_file_key(job_id=job_id, extension="png", folder="generated")
            self._storage_service.put(body=image_bytes, content_type="image/png", key=key)
            self._job_image_manager.create(
                ai_generation=generation,
                job_id=job_id,
                uploaded_by_id=user_id,
                kind=JobImageKind.GENERATED,
                label=f"AI Generated: {prompt[:50]}",
                storage_key=key,
            )
            return self._ai_generation_manager.apply_updates(
                generation,
                generated_image_url=self._storage_service.download_url(key=key),
                status=AIGenerationStatus.COMPLETED,
            )
        except Exception:
            self._ai_generation_manager.apply_updates(generation, status=AIGenerationStatus.FAILED)
            raise
