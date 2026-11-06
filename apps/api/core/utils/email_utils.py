"""Email address helpers."""


def normalize_email(email: str) -> str:
    """Returns the address in the form it is stored and looked up: trimmed and lower-cased.

    Mail providers treat the whole address as case-insensitive in practice, so
    `Pat@Example.com` and `pat@example.com` are one account.
    """
    return email.strip().lower()
