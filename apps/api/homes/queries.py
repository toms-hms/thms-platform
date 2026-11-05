"""GraphQL reads for homes and their membership."""

import graphene

from core.errors import NotFoundError
from core.graphql import authorize, current_user, login_required
from core.services.permission_service import Permission
from homes.models import Home, UserHome
from homes.types import HomeMemberType, HomeType


class HomesQuery(graphene.ObjectType):
    """Home reads."""

    homes = graphene.List(
        graphene.NonNull(HomeType), required=True, description="Homes the caller can access."
    )
    home = graphene.Field(HomeType, home_id=graphene.ID(required=True))
    home_members = graphene.List(
        graphene.NonNull(HomeMemberType),
        home_ids=graphene.List(graphene.NonNull(graphene.ID), required=True),
        required=True,
    )

    @login_required
    def resolve_homes(self, info):
        """Returns every home the caller belongs to; every home for an ADMIN."""
        return Home.objects.visible_to(current_user(info), Permission.HOME_VIEW)

    @authorize(Permission.HOME_VIEW, resource=Home, arg="home_id")
    def resolve_home(self, info, home_id: str):
        """Returns one home."""
        home = Home.objects.find(pk=home_id)
        if home is None:
            raise NotFoundError("Home")
        return home

    @login_required
    def resolve_home_members(self, info, home_ids: list[str]):
        """Returns the members of the homes the caller can see."""
        return (
            UserHome.objects.filter_home_ids(home_ids)
            .select_related("user")
            .visible_to(current_user(info), Permission.HOME_VIEW)
        )
