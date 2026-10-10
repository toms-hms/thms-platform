"""AI visualisations generated from a job's source image."""

from typing import Any

from ai.clients.openai_client import OpenAIClient
from ai.models import AIGeneration, AIGenerationStatus, JobImage, JobImageKind
from ai.utils.prompt_utils import IMAGE_MODEL, visualisation_prompt
from core.errors import BadRequestError, NotFoundError
from core.services.storage_service import StorageService


class ImageGenerationService:
    """Generates an image, stores it as a job image and records the generation."""

    def __init__(self, *, openai: OpenAIClient | None = None, storage: StorageService | None = None) -> None:
        self.openai = openai or OpenAIClient()
        self.storage = storage or StorageService()

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
        source_image = JobImage.objects.filter_ids([source_image_id]).first()
        if not source_image:
            raise NotFoundError("Source image")

        generation = AIGeneration.objects.create(
            job_id=job_id,
            original_image_url=self.storage.download_url(key=source_image.storage_key),
            prompt=prompt,
            provider=provider,
            status=AIGenerationStatus.PROCESSING,
            metadata=metadata,
            created_by_id=user_id,
        )
        try:
            image_bytes = self.openai.generate_image(model=IMAGE_MODEL, prompt=visualisation_prompt(prompt))
            key = self.storage.job_file_key(job_id=job_id, folder="generated", extension="png")
            self.storage.put(key=key, body=image_bytes, content_type="image/png")
            JobImage.objects.create(
                job_id=job_id,
                storage_key=key,
                kind=JobImageKind.GENERATED,
                label=f"AI Generated: {prompt[:50]}",
                ai_generation=generation,
                uploaded_by_id=user_id,
            )
            return AIGeneration.objects.apply_updates(
                generation,
                generated_image_url=self.storage.download_url(key=key),
                status=AIGenerationStatus.COMPLETED,
            )
        except Exception:
            AIGeneration.objects.apply_updates(generation, status=AIGenerationStatus.FAILED)
            raise

    def retry(self, *, generation_id: str, user_id: str) -> AIGeneration:
        """Re-runs a FAILED generation against the job's source image."""
        generation = AIGeneration.objects.get_or_404(pk=generation_id)
        if generation.status != AIGenerationStatus.FAILED:
            raise BadRequestError("Can only retry failed generations")
        source_image = JobImage.objects.find_source_image(generation.job_id)
        if not source_image:
            raise NotFoundError("Source image")
        return self.generate(
            job_id=generation.job_id,
            user_id=user_id,
            source_image_id=source_image.pk,
            prompt=generation.prompt,
            provider=generation.provider,
            metadata=generation.metadata,
        )
