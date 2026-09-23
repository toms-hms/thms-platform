"""GraphQL surface for job images and AI generations.

Image uploads are a three-step flow: request a presigned URL, PUT the bytes
straight to storage, then confirm so the row is written.
"""

import graphene
from graphene_django import DjangoObjectType

from ai import services
from ai.models import AIGeneration, JobImage
from core import permissions
from core.graphql import current_user, login_required
from jobs.models import Job
from uploads import services as uploads


class AIGenerationType(DjangoObjectType):
    """One recorded call to an AI provider."""

    metadata = graphene.JSONString()
    job_id = graphene.ID(required=True)

    class Meta:
        model = AIGeneration
        fields = (
            "id",
            "job",
            "original_image_url",
            "prompt",
            "generated_image_url",
            "provider",
            "status",
            "created_by",
            "created_at",
            "updated_at",
        )
        convert_choices_to_enum = False

    def resolve_job_id(self, info) -> str:
        """Returns the id of the job this generation belongs to."""
        return self.job_id


class JobImageType(DjangoObjectType):
    """An image attached to a job, with a presigned URL to read it."""

    url = graphene.String(required=True, description="Presigned download URL, valid for one hour.")
    job_id = graphene.ID(required=True)
    ai_generation_id = graphene.ID()

    class Meta:
        model = JobImage
        fields = ("id", "job", "storage_key", "kind", "label", "ai_generation", "uploaded_by", "created_at")
        convert_choices_to_enum = False

    def resolve_url(self, info) -> str:
        """Returns a presigned URL for the stored object."""
        return uploads.get_download_url(self.storage_key)

    def resolve_job_id(self, info) -> str:
        """Returns the id of the job this image belongs to."""
        return self.job_id

    def resolve_ai_generation_id(self, info) -> str | None:
        """Returns the id of the generation that produced this image, when it was generated."""
        return self.ai_generation_id


class UploadUrlType(graphene.ObjectType):
    """A presigned upload target."""

    upload_url = graphene.String(required=True)
    key = graphene.String(required=True)
    kind = graphene.String(required=True)


class EmailDraftType(graphene.ObjectType):
    """One generated outreach email."""

    contractor_id = graphene.ID(required=True)
    subject = graphene.String(required=True)
    body_text = graphene.String(required=True)
    body_html = graphene.String(required=True)


class CategorySuggestionType(graphene.ObjectType):
    """A trade category the assistant thinks the job needs, and why."""

    category = graphene.String(required=True)
    reason = graphene.String(required=True)


class DiagnoseResultType(graphene.ObjectType):
    """One turn of the diagnostic conversation."""

    question = graphene.String()
    options = graphene.List(graphene.NonNull(graphene.String), required=True)
    summary = graphene.JSONString()
    suggested_categories = graphene.List(graphene.NonNull(CategorySuggestionType))
    messages = graphene.JSONString(required=True)


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

    @login_required
    def mutate(self, info, job_id: str, file_name: str, content_type: str, kind: str):
        """Issues the presigned URL after checking the caller's access to the job."""
        permissions.require(Job.objects, current_user(info).pk, job_id)
        result = uploads.get_upload_url(
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

    @login_required
    def mutate(self, info, job_id: str, key: str, kind: str | None = None, label: str | None = None):
        """Writes the image row after checking the caller's access to the job."""
        user = current_user(info)
        permissions.require(Job.objects, user.pk, job_id)
        image = uploads.confirm_upload(
            job_id=job_id, user_id=user.pk, key=key, kind=kind or "SOURCE", label=label
        )
        return ConfirmUpload(image=image)


class DeleteImage(graphene.Mutation):
    """Deletes a job image and the object behind it."""

    class Arguments:
        image_id = graphene.ID(required=True)

    success = graphene.Boolean(required=True)

    @login_required
    def mutate(self, info, image_id: str):
        """Deletes the image after checking the caller's access to its job."""
        uploads.delete_job_image(image_id, current_user(info).pk)
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

    @login_required
    def mutate(self, info, job_id: str, source_image_id: str, prompt: str, provider=None, metadata=None):
        """Runs the generation after checking the caller's access to the job."""
        user = current_user(info)
        permissions.require(Job.objects, user.pk, job_id)
        generation = services.generate_image(
            job_id=job_id,
            user_id=user.pk,
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

    @login_required
    def mutate(self, info, job_id: str):
        """Returns the assistant's opening question."""
        permissions.require(Job.objects, current_user(info).pk, job_id)
        return StartDiagnose(result=DiagnoseResultType(**_diagnose_payload(services.start_diagnose(job_id))))


class DiagnoseJob(graphene.Mutation):
    """Answers the assistant's last question and returns its next turn."""

    class Arguments:
        job_id = graphene.ID(required=True)
        message = graphene.String(required=True)

    result = graphene.Field(DiagnoseResultType)

    @login_required
    def mutate(self, info, job_id: str, message: str):
        """Runs one diagnostic turn after checking the caller's access to the job."""
        permissions.require(Job.objects, current_user(info).pk, job_id)
        payload = _diagnose_payload(services.diagnose_job(job_id, message))
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

    @login_required
    def mutate(
        self,
        info,
        job_id: str,
        contractor_ids: list[str],
        tone=None,
        include_images=None,
        custom_instructions=None,
    ):
        """Returns one draft per contractor after checking the caller's access to the job."""
        user = current_user(info)
        permissions.require(Job.objects, user.pk, job_id)
        drafts = services.draft_email(
            job_id=job_id,
            user_id=user.pk,
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

    @login_required
    def resolve_job_images(self, info, job_id: str):
        """Returns the images on a job the caller can access."""
        permissions.require(Job.objects, current_user(info).pk, job_id)
        return JobImage.objects.list_for_job(job_id)

    @login_required
    def resolve_ai_generations(self, info, job_id: str):
        """Returns the generations recorded against a job the caller can access."""
        permissions.require(Job.objects, current_user(info).pk, job_id)
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
