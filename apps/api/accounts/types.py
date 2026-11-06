"""GraphQL types for accounts."""

import graphene
from graphene_django import DjangoObjectType

from accounts.models import User


class UserType(DjangoObjectType):
    """A user account. Password and refresh-token hashes are never exposed."""

    class Meta:
        model = User
        fields = ("id", "email", "first_name", "last_name", "role", "created_at", "updated_at")
        convert_choices_to_enum = False


class AuthTokensType(graphene.ObjectType):
    """The token pair issued on login, registration and refresh."""

    access_token = graphene.String(required=True)
    refresh_token = graphene.String(required=True)
