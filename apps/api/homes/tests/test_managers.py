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
        UserHome.objects.upsert(user_id=user.pk, home_id=home.pk, role=HomeRole.MEMBER)
        self.assertEqual(UserHome.objects.filter(user=user, home=home).count(), 1)
        self.assertEqual(UserHome.objects.find(user_id=user.pk, home_id=home.pk).role, HomeRole.MEMBER)
