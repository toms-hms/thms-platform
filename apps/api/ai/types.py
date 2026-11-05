"""GraphQL types for job images, AI generations and the diagnostic conversation."""

import graphene
from graphene_django import DjangoObjectType

from ai.models import AIGeneration, JobImage
from core.services.storage_service import StorageService


class AIGenerationType(DjangoObjectType):
    """One recorded call to an AI provider."""

    metadata = graphene.JSONString()

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


class JobImageType(DjangoObjectType):
    """An image attached to a job, with a presigned URL to read it."""

    url = graphene.String(required=True, description="Presigned download URL, valid for one hour.")

    class Meta:
        model = JobImage
        fields = ("id", "job", "storage_key", "kind", "label", "ai_generation", "uploaded_by", "created_at")
        convert_choices_to_enum = False

    def resolve_url(self, info) -> str:
        """Returns a presigned URL for the stored object."""
        return StorageService().download_url(key=self.storage_key)


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
