"""Home visibility and membership lookups."""

from django.test import TestCase

from accounts.factories import AdminFactory, UserFactory
from accounts.models import UserRole
from homes.factories import HomeFactory
from homes.models import Home, HomeRole, UserHome


class HasPermissionTests(TestCase):
    """HomeManager.has_permission()"""

    def test_true_for_a_member(self):
        """A member of the home may access it."""
        user = UserFactory()
        home = HomeFactory(owner=user)
        self.assertTrue(Home.objects.has_permission(user.pk, home.pk))

    def test_false_for_a_non_member(self):
        """Someone with no membership may not."""
        home = HomeFactory(owner=UserFactory())
        self.assertFalse(Home.objects.has_permission(UserFactory().pk, home.pk))

    def test_false_for_an_unknown_home(self):
        """An id that does not exist is not accessible."""
        self.assertFalse(Home.objects.has_permission(UserFactory().pk, "does-not-exist"))


class ListForUserTests(TestCase):
    """HomeManager.list_for_user()"""

    def test_returns_only_the_users_homes(self):
        """A user sees the homes they belong to and no others."""
        user, other = UserFactory(), UserFactory()
        mine = HomeFactory(owner=user)
        theirs = HomeFactory(owner=other)
        ids = [home.pk for home in Home.objects.list_for_user(user.pk, UserRole.USER)]
        self.assertIn(mine.pk, ids)
        self.assertNotIn(theirs.pk, ids)

    def test_admin_sees_every_home(self):
        """An ADMIN sees homes they are not a member of."""
        admin = AdminFactory()
        home = HomeFactory(owner=UserFactory())
        ids = [h.pk for h in Home.objects.list_for_user(admin.pk, UserRole.ADMIN)]
        self.assertIn(home.pk, ids)


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
