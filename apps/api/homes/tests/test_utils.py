"""Address formatting."""

from django.test import SimpleTestCase

from homes.utils.address_utils import format_address


class FormatAddressTests(SimpleTestCase):
    """address_utils.format_address()"""

    def test_renders_the_address_on_one_line(self):
        """Street, city, state and ZIP are joined into one display line."""
        self.assertEqual(
            format_address(address1="1 Main St", address2=None, city="Austin", state="TX", zip_code="78701"),
            "1 Main St, Austin, TX 78701",
        )

    def test_includes_the_second_line_when_present(self):
        """An apartment or suite line follows the street."""
        self.assertEqual(
            format_address(
                address1="1 Main St", address2="Apt 2", city="Austin", state="TX", zip_code="78701"
            ),
            "1 Main St, Apt 2, Austin, TX 78701",
        )
