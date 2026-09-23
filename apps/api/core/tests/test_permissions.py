"""The permission cache."""

from unittest.mock import patch

from django.core.cache import cache
from django.test import TestCase

from accounts.factories import UserFactory
from core import permissions
from core.errors import ForbiddenError
from homes.factories import HomeFactory
from homes.models import Home


class PermissionCacheTests(TestCase):
    """check(), grant() and invalidate()"""

    def setUp(self):
        """Clears the cache so each test starts cold."""
        cache.clear()
        self.user = UserFactory()
        self.home = HomeFactory(owner=self.user)

    def test_a_positive_result_is_cached(self):
        """A second check for the same pair does not re-query the database."""
        self.assertTrue(permissions.check(Home.objects, self.user.pk, self.home.pk))
        with patch.object(Home.objects, "has_permission") as has_permission:
            self.assertTrue(permissions.check(Home.objects, self.user.pk, self.home.pk))
            has_permission.assert_not_called()

    def test_a_denial_is_not_cached(self):
        """A denial is re-checked, so granting access takes effect immediately."""
        stranger = UserFactory()
        self.assertFalse(permissions.check(Home.objects, stranger.pk, self.home.pk))
        with patch.object(Home.objects, "has_permission", return_value=True) as has_permission:
            self.assertTrue(permissions.check(Home.objects, stranger.pk, self.home.pk))
            has_permission.assert_called_once()

    def test_invalidate_forces_a_re_check(self):
        """After invalidation the next check consults the database again."""
        permissions.grant(self.user.pk, self.home.pk)
        permissions.invalidate(self.user.pk, self.home.pk)
        with patch.object(Home.objects, "has_permission", return_value=False) as has_permission:
            self.assertFalse(permissions.check(Home.objects, self.user.pk, self.home.pk))
            has_permission.assert_called_once()

    def test_require_raises_for_a_stranger(self):
        """require() raises ForbiddenError rather than returning False."""
        with self.assertRaises(ForbiddenError):
            permissions.require(Home.objects, UserFactory().pk, self.home.pk)

    def test_an_empty_resource_id_is_never_permitted(self):
        """A missing resource id is refused without touching the database."""
        self.assertFalse(permissions.check(Home.objects, self.user.pk, ""))


class CacheOutageTests(TestCase):
    """Behaviour when the cache backend is unavailable"""

    def setUp(self):
        """Creates a user with one home."""
        cache.clear()
        self.user = UserFactory()
        self.home = HomeFactory(owner=self.user)

    def test_check_falls_back_to_the_database_when_the_cache_read_fails(self):
        """A cache outage must not turn a permitted request into a denial."""
        with patch.object(cache, "get", side_effect=ConnectionError("cache down")):
            self.assertTrue(permissions.check(Home.objects, self.user.pk, self.home.pk))

    def test_check_still_denies_a_stranger_when_the_cache_is_down(self):
        """Falling back to the database keeps the denial correct."""
        with patch.object(cache, "get", side_effect=ConnectionError("cache down")):
            self.assertFalse(permissions.check(Home.objects, UserFactory().pk, self.home.pk))

    def test_a_failed_cache_write_does_not_fail_the_request(self):
        """A write failure is swallowed — the answer is already correct."""
        with patch.object(cache, "set", side_effect=ConnectionError("cache down")):
            self.assertTrue(permissions.check(Home.objects, self.user.pk, self.home.pk))

    def test_invalidate_survives_a_cache_outage(self):
        """Invalidation does not raise when the backend is unreachable."""
        with patch.object(cache, "delete", side_effect=ConnectionError("cache down")):
            permissions.invalidate(self.user.pk, self.home.pk)
