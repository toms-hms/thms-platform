"""GraphQL surface for job images and AI generations.

Image uploads are a three-step flow: request a presigned URL, PUT the bytes
straight to storage, then confirm so the row is written.
"""

import graphene

from ai.models import AIGeneration, JobImage
from ai.services.diagnose_service import DiagnoseService
from ai.services.email_draft_service import EmailDraftService
from ai.services.image_generation_service import ImageGenerationService
from ai.services.job_image_service import JobImageService
from ai.types import (
    AIGenerationType,
    CategorySuggestionType,
    DiagnoseResultType,
    EmailDraftType,
    JobImageType,
    UploadUrlType,
)
from core.graphql import authorize, current_user
from core.services.permission_service import Permission
from jobs.models import Job


def _diagnose_payload(result: dict) -> dict:
    """Returns a diagnose service result shaped for the GraphQL type."""
    suggestions = result.get("suggested_categories")
    return {
        "question": result["question"],
        "options": result["options"],
        "summary": result["summary"],
        "suggested_categories": (
            [CategorySuggestionType(category=s.get("category"), reason=s.get("reason")) for s in suggestions]
            if suggestions
            else None
        ),
        "messages": result["messages"],
    }


class RequestUploadUrl(graphene.Mutation):
    """Returns a presigned URL for uploading an image to a job."""

    class Arguments:
        job_id = graphene.ID(required=True)
        file_name = graphene.String(required=True)
        content_type = graphene.String(required=True)
        kind = graphene.String(required=True)

    upload = graphene.Field(UploadUrlType)

    @authorize(Permission.JOBS_EDIT, resource=Job, arg="job_id")
    def mutate(self, info, job_id: str, file_name: str, content_type: str, kind: str):
        """Issues the presigned URL."""
        result = JobImageService().request_upload(
            job_id=job_id, file_name=file_name, content_type=content_type, kind=kind
        )
        return RequestUploadUrl(upload=UploadUrlType(**result))


class ConfirmUpload(graphene.Mutation):
    """Records a completed upload as a job image."""

    class Arguments:
        job_id = graphene.ID(required=True)
        key = graphene.String(required=True)
        kind = graphene.String()
        label = graphene.String()

    image = graphene.Field(JobImageType)

    @authorize(Permission.JOBS_EDIT, resource=Job, arg="job_id")
    def mutate(self, info, job_id: str, key: str, kind: str | None = None, label: str | None = None):
        """Writes the image row."""
        image = JobImageService().confirm_upload(
            job_id=job_id, user_id=current_user(info).pk, key=key, kind=kind, label=label
        )
        return ConfirmUpload(image=image)


class DeleteImage(graphene.Mutation):
    """Deletes a job image and the object behind it."""

    class Arguments:
        image_id = graphene.ID(required=True)

    success = graphene.Boolean(required=True)

    @authorize(Permission.JOBS_EDIT, resource=JobImage, arg="image_id")
    def mutate(self, info, image_id: str):
        """Deletes the image and its stored object."""
        JobImageService().delete(image_id=image_id)
        return DeleteImage(success=True)


class CreateAiGeneration(graphene.Mutation):
    """Generates a visualisation from an uploaded source image."""

    class Arguments:
        job_id = graphene.ID(required=True)
        source_image_id = graphene.ID(required=True)
        prompt = graphene.String(required=True)
        provider = graphene.String()
        metadata = graphene.JSONString()

    ai_generation = graphene.Field(AIGenerationType)

    @authorize(Permission.JOBS_EDIT, resource=Job, arg="job_id")
    def mutate(self, info, job_id: str, source_image_id: str, prompt: str, provider=None, metadata=None):
        """Runs the generation."""
        generation = ImageGenerationService().generate(
            job_id=job_id,
            user_id=current_user(info).pk,
            source_image_id=source_image_id,
            prompt=prompt,
            provider=provider or "openai",
            metadata=metadata,
        )
        return CreateAiGeneration(ai_generation=generation)


class StartDiagnose(graphene.Mutation):
    """Opens the diagnostic conversation for a job."""

    class Arguments:
        job_id = graphene.ID(required=True)

    result = graphene.Field(DiagnoseResultType)

    @authorize(Permission.JOBS_EDIT, resource=Job, arg="job_id")
    def mutate(self, info, job_id: str):
        """Returns the assistant's opening question."""
        return StartDiagnose(
            result=DiagnoseResultType(**_diagnose_payload(DiagnoseService().start(job_id=job_id)))
        )


class DiagnoseJob(graphene.Mutation):
    """Answers the assistant's last question and returns its next turn."""

    class Arguments:
        job_id = graphene.ID(required=True)
        message = graphene.String(required=True)

    result = graphene.Field(DiagnoseResultType)

    @authorize(Permission.JOBS_EDIT, resource=Job, arg="job_id")
    def mutate(self, info, job_id: str, message: str):
        """Runs one diagnostic turn."""
        payload = _diagnose_payload(DiagnoseService().answer(job_id=job_id, message=message))
        return DiagnoseJob(result=DiagnoseResultType(**payload))


class DraftEmail(graphene.Mutation):
    """Generates outreach email drafts for up to three contractors on a job."""

    class Arguments:
        job_id = graphene.ID(required=True)
        contractor_ids = graphene.List(graphene.NonNull(graphene.ID), required=True)
        tone = graphene.String()
        include_images = graphene.Boolean()
        custom_instructions = graphene.String()

    drafts = graphene.List(graphene.NonNull(EmailDraftType), required=True)

    @authorize(Permission.COMMUNICATIONS_EDIT, resource=Job, arg="job_id")
    def mutate(
        self,
        info,
        job_id: str,
        contractor_ids: list[str],
        tone=None,
        include_images=None,
        custom_instructions=None,
    ):
        """Returns one draft per contractor."""
        drafts = EmailDraftService().draft(
            job_id=job_id,
            user_id=current_user(info).pk,
            contractor_ids=contractor_ids,
            tone=tone or "professional",
            include_images=bool(include_images),
            custom_instructions=custom_instructions,
        )
        return DraftEmail(drafts=[EmailDraftType(**draft) for draft in drafts])


class AiQuery(graphene.ObjectType):
    """Image and generation reads."""

    job_images = graphene.List(
        graphene.NonNull(JobImageType), job_id=graphene.ID(required=True), required=True
    )
    ai_generations = graphene.List(
        graphene.NonNull(AIGenerationType), job_id=graphene.ID(required=True), required=True
    )

    @authorize(Permission.JOBS_VIEW, resource=Job, arg="job_id")
    def resolve_job_images(self, info, job_id: str):
        """Returns the images on a job."""
        return JobImage.objects.list_for_job(job_id)

    @authorize(Permission.JOBS_VIEW, resource=Job, arg="job_id")
    def resolve_ai_generations(self, info, job_id: str):
        """Returns the generations recorded against a job."""
        return AIGeneration.objects.list_for_job(job_id)


class AiMutation(graphene.ObjectType):
    """Image and generation writes."""

    request_upload_url = RequestUploadUrl.Field()
    confirm_upload = ConfirmUpload.Field()
    delete_image = DeleteImage.Field()
    create_ai_generation = CreateAiGeneration.Field()
    start_diagnose = StartDiagnose.Field()
    diagnose_job = DiagnoseJob.Field()
    draft_email = DraftEmail.Field()
