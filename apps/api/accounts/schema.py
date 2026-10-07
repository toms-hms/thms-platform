"""GraphQL surface for accounts: registration, login, token refresh and `me`."""

import graphene

from accounts import services
from accounts.types import AuthTokensType, UserType
from core.graphql import current_user, login_required


class Register(graphene.Mutation):
    """Creates an account and signs the new user in."""

    class Arguments:
        email = graphene.String(required=True)
        password = graphene.String(required=True)
        first_name = graphene.String(required=True)
        last_name = graphene.String(required=True)

    user = graphene.Field(UserType)
    tokens = graphene.Field(AuthTokensType)

    def mutate(self, info, email: str, password: str, first_name: str, last_name: str):
        """Registers the user and returns them with a fresh token pair."""
        result = services.register(email=email, password=password, first_name=first_name, last_name=last_name)
        return Register(user=result["user"], tokens=AuthTokensType(**result["tokens"]))


class Login(graphene.Mutation):
    """Exchanges credentials for a token pair."""

    class Arguments:
        email = graphene.String(required=True)
        password = graphene.String(required=True)

    user = graphene.Field(UserType)
    tokens = graphene.Field(AuthTokensType)

    def mutate(self, info, email: str, password: str):
        """Authenticates the user and returns them with a fresh token pair."""
        result = services.login(email=email, password=password)
        return Login(user=result["user"], tokens=AuthTokensType(**result["tokens"]))


class RefreshTokens(graphene.Mutation):
    """Exchanges a refresh token for a new token pair."""

    class Arguments:
        refresh_token = graphene.String(required=True)

    tokens = graphene.Field(AuthTokensType)

    def mutate(self, info, refresh_token: str):
        """Rotates the token pair for the user the refresh token belongs to."""
        result = services.refresh_tokens(refresh_token)
        return RefreshTokens(tokens=AuthTokensType(**result["tokens"]))


class Logout(graphene.Mutation):
    """Revokes the caller's refresh token."""

    success = graphene.Boolean(required=True)

    @login_required
    def mutate(self, info):
        """Clears the stored refresh-token hash for the authenticated user."""
        services.logout(current_user(info).pk)
        return Logout(success=True)


class AccountsQuery(graphene.ObjectType):
    """Account reads."""

    me = graphene.Field(UserType, description="The authenticated user.")

    @login_required
    def resolve_me(self, info):
        """Returns the authenticated user's own record."""
        return services.get_me(current_user(info).pk)


class AccountsMutation(graphene.ObjectType):
    """Account writes."""

    register = Register.Field()
    login = Login.Field()
    refresh_tokens = RefreshTokens.Field()
    logout = Logout.Field()
