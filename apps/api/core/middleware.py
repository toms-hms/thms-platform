"""Request middleware.

Authentication is stateless: the Bearer token is decoded on every request and
the matching user attached to `request.user`. This runs before
AuditlogMiddleware so audit entries record the acting user.
"""

from collections.abc import Callable

from django.http import HttpRequest, HttpResponse
from django.utils.functional import SimpleLazyObject

from core.errors import UnauthorizedError
from core.utils.jwt_utils import verify_access_token


class AnonymousUser:
    """Stand-in for an unauthenticated caller, mirroring the attributes auditlog reads."""

    id = None
    pk = None
    is_authenticated = False
    is_anonymous = True
    role = None

    def __str__(self) -> str:
        return "AnonymousUser"


def _load_user(token: str):
    """Returns the user named by the token's `sub` claim, or AnonymousUser when it cannot be resolved."""
    from accounts.models import User

    try:
        claims = verify_access_token(token)
    except UnauthorizedError:
        return AnonymousUser()
    user = User.objects.filter(pk=claims.get("sub")).first()
    return user or AnonymousUser()


class JWTAuthenticationMiddleware:
    """Attaches `request.user` from the `Authorization: Bearer <token>` header."""

    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]):
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        """Resolves the bearer token lazily and hands the request on to the next middleware."""
        header = request.headers.get("Authorization", "")
        if header.startswith("Bearer "):
            token = header[7:]
            request.user = SimpleLazyObject(lambda: _load_user(token))
        else:
            request.user = AnonymousUser()
        return self.get_response(request)
