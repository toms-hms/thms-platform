"""Home visibility filters and lookups."""

import uuid

from django.test import TestCase

from accounts.factories import AdminFactory, UserFactory
from core.errors import NotFoundError
from core.services.permission_service import Permission
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
        self.assertIsNone(Home.objects.home_id_for(str(uuid.uuid4())))

    def test_none_for_a_malformed_id(self):
        """An id that is not a UUID resolves to no home rather than raising."""
        self.assertIsNone(Home.objects.home_id_for("not-a-uuid"))


class GetOr404Tests(TestCase):
    """BaseQuerySet.get_or_404()"""

    def test_a_malformed_id_is_not_found(self):
        """An id that is not a UUID raises NotFoundError rather than a validation error."""
        with self.assertRaises(NotFoundError):
            Home.objects.get_or_404(pk="not-a-uuid")


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
        UserHome.objects.upsert(user_id=member.pk, home_id=home.pk, role=HomeRole.MEMBER)
        self.assertTrue(Home.objects.visible_to(member, Permission.HOME_VIEW).filter(pk=home.pk).exists())
        self.assertFalse(Home.objects.visible_to(member, Permission.HOME_DELETE).filter(pk=home.pk).exists())

    def test_admin_sees_every_home(self):
        """An ADMIN sees homes they are not a member of."""
        home = HomeFactory(owner=UserFactory())
        ids = Home.objects.visible_to(AdminFactory(), Permission.HOME_VIEW).values_list("pk", flat=True)
        self.assertIn(home.pk, ids)
