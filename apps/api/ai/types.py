"""GraphQL types for job images, AI generations and the diagnostic conversation."""

import graphene
from graphene_django import DjangoObjectType

from ai.models import AIGeneration, JobImage
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
