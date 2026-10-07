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
        UserHome.objects.upsert(user.pk, home.pk, HomeRole.MEMBER)
        self.assertEqual(UserHome.objects.filter(user=user, home=home).count(), 1)
        self.assertEqual(UserHome.objects.find_membership(user.pk, home.pk).role, HomeRole.MEMBER)

    def test_lists_members_of_a_home(self):
        """Every member of the home is returned."""
        owner, member = UserFactory(), UserFactory()
        home = HomeFactory(owner=owner)
        UserHome.objects.upsert(member.pk, home.pk, HomeRole.MEMBER)
        emails = {m.user.email for m in UserHome.objects.list_members_for_home(home.pk)}
        self.assertEqual(emails, {owner.email, member.email})
