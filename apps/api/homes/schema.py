"""GraphQL surface for homes and their membership."""

import graphene

from core.enums import HomeRoleEnum
from core.graphql import authorize, current_user, login_required
from core.permissions import Permission
from homes import services
from homes.models import Home, HomeRole, UserHome
from homes.types import HomeMemberType, HomeType


class CreateHome(graphene.Mutation):
    """Creates a home owned by the caller."""

    class Arguments:
        name = graphene.String(required=True)
        address1 = graphene.String(required=True)
        city = graphene.String(required=True)
        state = graphene.String(required=True)
        zip_code = graphene.String(required=True)
        address2 = graphene.String()
        country = graphene.String()
        notes = graphene.String()

    home = graphene.Field(HomeType)

    @login_required
    def mutate(self, info, **data):
        """Creates the home and makes the caller its owner."""
        return CreateHome(home=services.create_home(current_user(info).pk, data))


class UpdateHome(graphene.Mutation):
    """Updates fields on a home the caller can access."""

    class Arguments:
        home_id = graphene.ID(required=True)
        name = graphene.String()
        address1 = graphene.String()
        address2 = graphene.String()
        city = graphene.String()
        state = graphene.String()
        zip_code = graphene.String()
        notes = graphene.String()

    home = graphene.Field(HomeType)

    @authorize(Permission.HOME_EDIT, resource=Home, arg="home_id")
    def mutate(self, info, home_id: str, **data):
        """Applies the update to the home."""
        return UpdateHome(home=services.update_home(home_id, data))


class DeleteHome(graphene.Mutation):
    """Deletes a home. Only an owner may do this."""

    class Arguments:
        home_id = graphene.ID(required=True)

    success = graphene.Boolean(required=True)

    @authorize(Permission.HOME_DELETE, resource=Home, arg="home_id")
    def mutate(self, info, home_id: str):
        """Deletes the home."""
        services.delete_home(home_id)
        return DeleteHome(success=True)


class AddHomeUser(graphene.Mutation):
    """Adds another user to a home by email address."""

    class Arguments:
        home_id = graphene.ID(required=True)
        email = graphene.String(required=True)
        role = HomeRoleEnum()

    member = graphene.Field(HomeMemberType)

    @authorize(Permission.HOME_MANAGE_MEMBERS, resource=Home, arg="home_id")
    def mutate(self, info, home_id: str, email: str, role: str | None = None):
        """Grants the named user access to the home."""
        return AddHomeUser(member=services.add_user_to_home(home_id, email, role or HomeRole.MEMBER))


class RemoveHomeUser(graphene.Mutation):
    """Removes a user's access to a home."""

    class Arguments:
        home_id = graphene.ID(required=True)
        user_id = graphene.ID(required=True)

    success = graphene.Boolean(required=True)

    @authorize(Permission.HOME_MANAGE_MEMBERS, resource=Home, arg="home_id")
    def mutate(self, info, home_id: str, user_id: str):
        """Revokes the named user's membership of the home."""
        services.remove_user_from_home(home_id, user_id)
        return RemoveHomeUser(success=True)


class HomesQuery(graphene.ObjectType):
    """Home reads."""

    homes = graphene.List(
        graphene.NonNull(HomeType), required=True, description="Homes the caller can access."
    )
    home = graphene.Field(HomeType, home_id=graphene.ID(required=True))
    home_members = graphene.List(
        graphene.NonNull(HomeMemberType), home_id=graphene.ID(required=True), required=True
    )

    @login_required
    def resolve_homes(self, info):
        """Returns every home the caller belongs to; every home for an ADMIN."""
        return Home.objects.visible_to(current_user(info), Permission.HOME_VIEW)

    @authorize(Permission.HOME_VIEW, resource=Home, arg="home_id")
    def resolve_home(self, info, home_id: str):
        """Returns one home."""
        return Home.objects.get_or_404(pk=home_id)

    @authorize(Permission.HOME_VIEW, resource=Home, arg="home_id")
    def resolve_home_members(self, info, home_id: str):
        """Returns the home's members."""
        return UserHome.objects.list_members_for_home(home_id)


class HomesMutation(graphene.ObjectType):
    """Home writes."""

    create_home = CreateHome.Field()
    update_home = UpdateHome.Field()
    delete_home = DeleteHome.Field()
    add_home_user = AddHomeUser.Field()
    remove_home_user = RemoveHomeUser.Field()
