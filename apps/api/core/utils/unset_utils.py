"""The UNSET sentinel: "this argument was not provided", as distinct from None.

Update services default every optional field to UNSET. A GraphQL mutation omits
arguments the client did not send, so `service(**data)` leaves them UNSET, while
an explicit `null` arrives as None and clears the field.
"""

from typing import Final


class Unset:
    """Type of the UNSET sentinel. Falsy, and a singleton."""

    _instance: "Unset | None" = None

    def __new__(cls) -> "Unset":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __bool__(self) -> bool:
        return False

    def __repr__(self) -> str:
        return "UNSET"


UNSET: Final = Unset()


def is_set(value: object) -> bool:
    """Returns True when the value was provided (anything but UNSET, including None)."""
    return value is not UNSET
