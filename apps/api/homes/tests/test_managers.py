"""Home membership lookups."""

from django.test import TestCase

from accounts.factories import UserFactory
from homes.factories import HomeFactory
from homes.models import HomeRole, UserHome


class MembershipTests(TestCase):
    """UserHomeManager"""

    def test_upsert_updates_the_role_of_an_existing_member(self):
        """Re-adding an existing member changes their role rather than duplicating the row."""
        user = UserFactory()
        home = HomeFactory(owner=user)
        UserHome.objects.upsert(home_id=home.pk, user_id=user.pk, role=HomeRole.MEMBER)
        self.assertEqual(UserHome.objects.filter(home=home, user=user).count(), 1)
        self.assertEqual(UserHome.objects.find(home_id=home.pk, user_id=user.pk).role, HomeRole.MEMBER)

    def test_role_for_returns_the_members_role(self):
        """A member's role comes back; a stranger has none."""
        owner, stranger = UserFactory(), UserFactory()
        home = HomeFactory(owner=owner)
        self.assertEqual(UserHome.objects.role_for(home_id=home.pk, user_id=owner.pk), HomeRole.OWNER)
        self.assertIsNone(UserHome.objects.role_for(home_id=home.pk, user_id=stranger.pk))

    def test_member_ids_lists_every_member(self):
        """Owner and members are all returned."""
        owner, member = UserFactory(), UserFactory()
        home = HomeFactory(owner=owner)
        UserHome.objects.upsert(home_id=home.pk, user_id=member.pk, role=HomeRole.MEMBER)
        self.assertEqual(set(UserHome.objects.member_ids(home_id=home.pk)), {owner.pk, member.pk})

    def test_remove_deletes_only_that_membership(self):
        """Removing one member leaves the others in place."""
        owner, member = UserFactory(), UserFactory()
        home = HomeFactory(owner=owner)
        UserHome.objects.upsert(home_id=home.pk, user_id=member.pk, role=HomeRole.MEMBER)
        UserHome.objects.remove(home_id=home.pk, user_id=member.pk)
        self.assertEqual(UserHome.objects.member_ids(home_id=home.pk), [owner.pk])

    def test_home_ids_with_roles_filters_by_role(self):
        """Only homes where the user holds one of the roles are returned."""
        user = UserFactory()
        owned = HomeFactory(owner=user)
        joined = HomeFactory(owner=UserFactory())
        UserHome.objects.upsert(home_id=joined.pk, user_id=user.pk, role=HomeRole.MEMBER)
        ids = UserHome.objects.home_ids_with_roles(user_id=user.pk, roles=[HomeRole.OWNER])
        self.assertEqual([row["home_id"] for row in ids], [owned.pk])
