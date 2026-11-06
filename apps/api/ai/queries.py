"""GraphQL reads for job images and AI generations."""

import graphene

from ai.models import AIGeneration, JobImage
from ai.types import (
    AIGenerationType,
    JobImageType,
)
from core.graphql import current_user, login_required
from core.services.permission_service import Permission


class AiQuery(graphene.ObjectType):
    """Image and generation reads."""

    job_images = graphene.List(
        graphene.NonNull(JobImageType),
        job_ids=graphene.List(graphene.NonNull(graphene.ID), required=True),
        required=True,
    )
    ai_generations = graphene.List(
        graphene.NonNull(AIGenerationType),
        job_ids=graphene.List(graphene.NonNull(graphene.ID), required=True),
        required=True,
    )

    @login_required
    def resolve_job_images(self, info, job_ids: list[str]):
        """Returns the images on the jobs the caller can see."""
        return JobImage.objects.filter_job_ids(job_ids).visible_to(current_user(info), Permission.JOBS_VIEW)

    @login_required
    def resolve_ai_generations(self, info, job_ids: list[str]):
        """Returns the generations recorded against the jobs the caller can see."""
        return AIGeneration.objects.filter_job_ids(job_ids).visible_to(
            current_user(info), Permission.JOBS_VIEW
        )
