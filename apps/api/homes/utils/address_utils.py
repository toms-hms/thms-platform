"""Postal address formatting."""


def format_address(*, address1: str, address2: str | None, city: str, state: str, zip_code: str) -> str:
    """Returns the address as a single display line: `1 Main St, Apt 2, Austin, TX 78701`."""
    street = ", ".join(part for part in (address1, address2) if part)
    return f"{street}, {city}, {state} {zip_code}"
