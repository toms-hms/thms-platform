"""Home visibility filters."""

from django.test import TestCase

from accounts.factories import AdminFactory, UserFactory
from core.permissions import Permission
from homes.factories import HomeFactory
from homes.models import Home, HomeRole, UserHome


class HomeIdForTests(TestCase):
    """HomeQuerySet.home_id_for()"""

    def test_a_home_is_its_own_scope(self):
        """A home resolves to its own id."""
        home = HomeFactory(owner=UserFactory())
        self.assertEqual(Home.objects.home_id_for(home.pk), home.pk)

    def test_none_for_an_unknown_home(self):
        """An id that does not exist resolves to no home."""
        self.assertIsNone(Home.objects.home_id_for("does-not-exist"))


class VisibleToTests(TestCase):
    """HomeQuerySet.visible_to()"""

    def test_returns_only_the_users_homes(self):
        """A user sees the homes they belong to and no others."""
        user = UserFactory()
        mine = HomeFactory(owner=user)
        theirs = HomeFactory(owner=UserFactory())
        ids = set(Home.objects.visible_to(user, Permission.HOME_VIEW).values_list("pk", flat=True))
        self.assertIn(mine.pk, ids)
        self.assertNotIn(theirs.pk, ids)

    def test_respects_the_permission_asked_for(self):
        """A member sees the home for HOME_VIEW but not for HOME_DELETE."""
        member = UserFactory()
        home = HomeFactory(owner=UserFactory())
        UserHome.objects.upsert(member.pk, home.pk, HomeRole.MEMBER)
        self.assertTrue(Home.objects.visible_to(member, Permission.HOME_VIEW).filter(pk=home.pk).exists())
        self.assertFalse(Home.objects.visible_to(member, Permission.HOME_DELETE).filter(pk=home.pk).exists())

    def test_admin_sees_every_home(self):
        """An ADMIN sees homes they are not a member of."""
        home = HomeFactory(owner=UserFactory())
        ids = Home.objects.visible_to(AdminFactory(), Permission.HOME_VIEW).values_list("pk", flat=True)
        self.assertIn(home.pk, ids)
