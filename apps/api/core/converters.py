"""GraphQL conversions for Django fields, registered when the core app loads.

UUID primary keys are exposed as `String!`, not graphene's `UUID` scalar: on the
wire both are the same string, and clients keep treating ids as opaque strings.
"""

import graphene
from django.db import models
from graphene_django.converter import convert_django_field


@convert_django_field.register(models.UUIDField)
def convert_uuid_to_string(field, registry=None):
    """Returns a String for a UUID column, required unless the column is nullable."""
    return graphene.String(description=field.help_text or None, required=not field.null)
