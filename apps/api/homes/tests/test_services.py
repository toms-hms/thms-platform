"""Home creation, membership changes and deletion."""

from django.core.cache import cache
from django.test import TestCase

from accounts.factories import UserFactory
from core.errors import BadRequestError, NotFoundError
from core.services.permission_service import Permission, PermissionService
from homes.factories import HomeFactory
from homes.models import Home, HomeRole, UserHome
from homes.services.home_service import HomeService
from homes.services.user_home_service import UserHomeService

HOME_INPUT = {"name": "Test Home", "address1": "1 St", "city": "Austin", "state": "TX", "zip_code": "78701"}


class CreateHomeTests(TestCase):
    """HomeService.create()"""

    def test_creates_the_home_and_owns_it(self):
        """The creator becomes the home's owner."""
        user = UserFactory()
        home = HomeService().create(user_id=user.pk, **HOME_INPUT)
        membership = UserHome.objects.find(home_id=home.pk, user_id=user.pk)
        self.assertEqual(membership.role, HomeRole.OWNER)


class DeleteHomeTests(TestCase):
    """HomeService.delete()"""

    def setUp(self):
        """Clears the cache so a stale role cannot leak between tests."""
        cache.clear()

    def test_deletes_the_home(self):
        """The home and its memberships are removed."""
        home = HomeFactory(owner=UserFactory())
        HomeService().delete(home_id=home.pk)
        self.assertFalse(Home.objects.filter(pk=home.pk).exists())
        self.assertFalse(UserHome.objects.filter(home_id=home.pk).exists())

    def test_invalidates_every_members_cached_role(self):
        """After deletion no member keeps access through the cache."""
        owner, member = UserFactory(), UserFactory()
        home = HomeFactory(owner=owner)
        UserHome.objects.upsert(home_id=home.pk, user_id=member.pk, role=HomeRole.MEMBER)
        for user in (owner, member):
            PermissionService().membership_role(home_id=home.pk, user_id=user.pk)
        HomeService().delete(home_id=home.pk)
        for user in (owner, member):
            self.assertFalse(PermissionService().can(user, Permission.HOME_VIEW, home.pk))


class UserHomeServiceTests(TestCase):
    """UserHomeService.create() and delete()"""

    def test_adds_a_user_by_email(self):
        """A user is added to the home by their email address."""
        owner, invitee = UserFactory(), UserFactory()
        home = HomeFactory(owner=owner)
        UserHomeService().create(home_id=home.pk, role=HomeRole.MEMBER, email=invitee.email)
        self.assertIsNotNone(UserHome.objects.find(home_id=home.pk, user_id=invitee.pk))

    def test_unknown_email_is_not_found(self):
        """Adding an email with no account raises NotFoundError."""
        home = HomeFactory(owner=UserFactory())
        with self.assertRaises(NotFoundError):
            UserHomeService().create(home_id=home.pk, role=HomeRole.MEMBER, email="nobody@example.com")

    def test_adds_a_user_by_id(self):
        """A user can be added by id, as HomeService does for the owner."""
        home = HomeFactory(owner=UserFactory())
        member = UserFactory()
        UserHomeService().create(home_id=home.pk, role=HomeRole.MEMBER, user_id=member.pk)
        self.assertEqual(UserHome.objects.role_for(home_id=home.pk, user_id=member.pk), HomeRole.MEMBER)

    def test_requires_a_user_id_or_an_email(self):
        """Neither identifier is a bad request."""
        home = HomeFactory(owner=UserFactory())
        with self.assertRaises(BadRequestError):
            UserHomeService().create(home_id=home.pk, role=HomeRole.MEMBER)

    def test_removes_a_member(self):
        """Removing a member drops their membership row."""
        owner, member = UserFactory(), UserFactory()
        home = HomeFactory(owner=owner)
        UserHome.objects.upsert(home_id=home.pk, user_id=member.pk, role=HomeRole.MEMBER)
        UserHomeService().delete(home_id=home.pk, user_id=member.pk)
        self.assertIsNone(UserHome.objects.find(home_id=home.pk, user_id=member.pk))

    def test_changing_a_role_takes_effect_despite_the_cache(self):
        """Re-adding an owner as a member invalidates their cached OWNER role."""
        cache.clear()
        owner = UserFactory()
        home = HomeFactory(owner=owner)
        self.assertTrue(PermissionService().can(owner, Permission.HOME_DELETE, home.pk))
        UserHomeService().create(home_id=home.pk, role=HomeRole.MEMBER, email=owner.email)
        self.assertFalse(PermissionService().can(owner, Permission.HOME_DELETE, home.pk))
