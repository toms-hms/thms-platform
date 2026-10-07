"""The access policy and its membership cache."""

from unittest.mock import patch

from django.core.cache import cache
from django.test import TestCase

from accounts.factories import AdminFactory, UserFactory
from core import permissions
from core.errors import ForbiddenError
from core.permissions import Permission
from homes.factories import HomeFactory
from homes.models import HomeRole, UserHome


class RolePermissionsTests(TestCase):
    """role_permissions() and roles_with()"""

    def test_owner_holds_every_permission(self):
        """OWNER is granted the full permission set."""
        self.assertEqual(permissions.role_permissions(HomeRole.OWNER), frozenset(Permission))

    def test_member_holds_everything_but_deleting_the_home(self):
        """MEMBER matches today's access: everything except deleting the home."""
        granted = permissions.role_permissions(HomeRole.MEMBER)
        self.assertNotIn(Permission.HOME_DELETE, granted)
        self.assertEqual(granted, frozenset(Permission) - {Permission.HOME_DELETE})

    def test_roles_with_lists_the_granting_roles(self):
        """Only roles that grant the permission are returned."""
        self.assertEqual(permissions.roles_with(Permission.HOME_DELETE), [HomeRole.OWNER])
        self.assertCountEqual(permissions.roles_with(Permission.JOBS_VIEW), [HomeRole.OWNER, HomeRole.MEMBER])


class CanTests(TestCase):
    """can() and require()"""

    def setUp(self):
        """Creates an owner, a member and a stranger around one home."""
        cache.clear()
        self.owner, self.member, self.stranger = UserFactory(), UserFactory(), UserFactory()
        self.home = HomeFactory(owner=self.owner)
        UserHome.objects.upsert(self.member.pk, self.home.pk, HomeRole.MEMBER)

    def test_owner_may_delete_the_home(self):
        """An owner holds HOME_DELETE."""
        self.assertTrue(permissions.can(self.owner, Permission.HOME_DELETE, self.home.pk))

    def test_member_may_not_delete_the_home(self):
        """A member holds every permission but HOME_DELETE."""
        self.assertTrue(permissions.can(self.member, Permission.JOBS_EDIT, self.home.pk))
        self.assertFalse(permissions.can(self.member, Permission.HOME_DELETE, self.home.pk))

    def test_a_stranger_holds_nothing(self):
        """A user with no membership is refused every permission."""
        self.assertFalse(permissions.can(self.stranger, Permission.HOME_VIEW, self.home.pk))

    def test_admin_holds_everything(self):
        """ADMIN is allowed explicitly, without membership."""
        self.assertTrue(permissions.can(AdminFactory(), Permission.HOME_DELETE, self.home.pk))

    def test_a_missing_home_is_never_permitted(self):
        """No home id means no access, even for an ADMIN."""
        self.assertFalse(permissions.can(self.owner, Permission.HOME_VIEW, None))
        self.assertFalse(permissions.can(AdminFactory(), Permission.HOME_VIEW, ""))

    def test_require_raises_for_a_stranger(self):
        """require() raises ForbiddenError rather than returning False."""
        with self.assertRaises(ForbiddenError):
            permissions.require(self.stranger, Permission.HOME_VIEW, self.home.pk)


class HomeIdsWithTests(TestCase):
    """home_ids_with()"""

    def test_returns_homes_whose_role_grants_the_permission(self):
        """A member's home counts for JOBS_VIEW but not for HOME_DELETE."""
        member = UserFactory()
        owned = HomeFactory(owner=member)
        joined = HomeFactory(owner=UserFactory())
        UserHome.objects.upsert(member.pk, joined.pk, HomeRole.MEMBER)

        viewable = {row["home_id"] for row in permissions.home_ids_with(member, Permission.JOBS_VIEW)}
        deletable = {row["home_id"] for row in permissions.home_ids_with(member, Permission.HOME_DELETE)}
        self.assertEqual(viewable, {owned.pk, joined.pk})
        self.assertEqual(deletable, {owned.pk})


class MembershipCacheTests(TestCase):
    """membership_role() caching and invalidate()"""

    def setUp(self):
        """Clears the cache so each test starts cold."""
        cache.clear()
        self.user = UserFactory()
        self.home = HomeFactory(owner=self.user)

    def test_a_membership_is_cached(self):
        """A second lookup for the same pair does not re-query the database."""
        permissions.membership_role(self.user.pk, self.home.pk)
        with self.assertNumQueries(0):
            self.assertEqual(permissions.membership_role(self.user.pk, self.home.pk), HomeRole.OWNER)

    def test_a_non_member_is_not_cached(self):
        """A miss is re-checked, so adding someone takes effect immediately."""
        stranger = UserFactory()
        self.assertIsNone(permissions.membership_role(stranger.pk, self.home.pk))
        UserHome.objects.upsert(stranger.pk, self.home.pk, HomeRole.MEMBER)
        self.assertEqual(permissions.membership_role(stranger.pk, self.home.pk), HomeRole.MEMBER)

    def test_invalidate_forces_a_re_check(self):
        """After invalidation, a changed role is read from the database."""
        permissions.membership_role(self.user.pk, self.home.pk)
        UserHome.objects.upsert(self.user.pk, self.home.pk, HomeRole.MEMBER)
        permissions.invalidate(self.user.pk, self.home.pk)
        self.assertEqual(permissions.membership_role(self.user.pk, self.home.pk), HomeRole.MEMBER)


class CacheOutageTests(TestCase):
    """Behaviour when the cache backend is unavailable"""

    def setUp(self):
        """Creates a user with one home."""
        cache.clear()
        self.user = UserFactory()
        self.home = HomeFactory(owner=self.user)

    def test_falls_back_to_the_database_when_the_cache_read_fails(self):
        """A cache outage must not turn a permitted request into a denial."""
        with patch.object(cache, "get", side_effect=ConnectionError("cache down")):
            self.assertTrue(permissions.can(self.user, Permission.HOME_VIEW, self.home.pk))

    def test_still_denies_a_stranger_when_the_cache_is_down(self):
        """Falling back to the database keeps the denial correct."""
        with patch.object(cache, "get", side_effect=ConnectionError("cache down")):
            self.assertFalse(permissions.can(UserFactory(), Permission.HOME_VIEW, self.home.pk))

    def test_a_failed_cache_write_does_not_fail_the_request(self):
        """A write failure is swallowed — the answer is already correct."""
        with patch.object(cache, "set", side_effect=ConnectionError("cache down")):
            self.assertTrue(permissions.can(self.user, Permission.HOME_VIEW, self.home.pk))

    def test_invalidate_survives_a_cache_outage(self):
        """Invalidation does not raise when the backend is unreachable."""
        with patch.object(cache, "delete", side_effect=ConnectionError("cache down")):
            permissions.invalidate(self.user.pk, self.home.pk)
