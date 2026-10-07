"""Home creation, membership changes and deletion."""

from django.core.cache import cache
from django.test import TestCase

from accounts.factories import UserFactory
from core import permissions
from core.errors import NotFoundError
from core.permissions import Permission
from homes import services
from homes.factories import HomeFactory
from homes.models import Home, HomeRole, UserHome

HOME_INPUT = {"name": "Test Home", "address1": "1 St", "city": "Austin", "state": "TX", "zip_code": "78701"}


class CreateHomeTests(TestCase):
    """create_home()"""

    def test_creates_the_home_and_owns_it(self):
        """The creator becomes the home's owner."""
        user = UserFactory()
        home = services.create_home(user.pk, HOME_INPUT)
        membership = UserHome.objects.find_membership(user.pk, home.pk)
        self.assertEqual(membership.role, HomeRole.OWNER)

    def test_full_address_renders_on_one_line(self):
        """The home exposes its address as a single display string."""
        home = services.create_home(UserFactory().pk, HOME_INPUT)
        self.assertEqual(home.full_address, "1 St, Austin, TX 78701")


class DeleteHomeTests(TestCase):
    """delete_home()"""

    def setUp(self):
        """Clears the cache so a stale role cannot leak between tests."""
        cache.clear()

    def test_deletes_the_home(self):
        """The home and its memberships are removed."""
        home = HomeFactory(owner=UserFactory())
        services.delete_home(home.pk)
        self.assertFalse(Home.objects.filter(pk=home.pk).exists())
        self.assertFalse(UserHome.objects.filter(home_id=home.pk).exists())

    def test_invalidates_every_members_cached_role(self):
        """After deletion no member keeps access through the cache."""
        owner, member = UserFactory(), UserFactory()
        home = HomeFactory(owner=owner)
        UserHome.objects.upsert(member.pk, home.pk, HomeRole.MEMBER)
        for user in (owner, member):
            permissions.membership_role(user.pk, home.pk)
        services.delete_home(home.pk)
        for user in (owner, member):
            self.assertFalse(permissions.can(user, Permission.HOME_VIEW, home.pk))


class MembershipServiceTests(TestCase):
    """add_user_to_home() and remove_user_from_home()"""

    def test_adds_a_user_by_email(self):
        """A user is added to the home by their email address."""
        owner, invitee = UserFactory(), UserFactory()
        home = HomeFactory(owner=owner)
        services.add_user_to_home(home.pk, invitee.email, HomeRole.MEMBER)
        self.assertIsNotNone(UserHome.objects.find_membership(invitee.pk, home.pk))

    def test_unknown_email_is_not_found(self):
        """Adding an email with no account raises NotFoundError."""
        home = HomeFactory(owner=UserFactory())
        with self.assertRaises(NotFoundError):
            services.add_user_to_home(home.pk, "nobody@example.com", HomeRole.MEMBER)

    def test_removes_a_member(self):
        """Removing a member drops their membership row."""
        owner, member = UserFactory(), UserFactory()
        home = HomeFactory(owner=owner)
        UserHome.objects.upsert(member.pk, home.pk, HomeRole.MEMBER)
        services.remove_user_from_home(home.pk, member.pk)
        self.assertIsNone(UserHome.objects.find_membership(member.pk, home.pk))

    def test_changing_a_role_takes_effect_despite_the_cache(self):
        """Re-adding an owner as a member invalidates their cached OWNER role."""
        cache.clear()
        owner = UserFactory()
        home = HomeFactory(owner=owner)
        self.assertTrue(permissions.can(owner, Permission.HOME_DELETE, home.pk))
        services.add_user_to_home(home.pk, owner.email, HomeRole.MEMBER)
        self.assertFalse(permissions.can(owner, Permission.HOME_DELETE, home.pk))
