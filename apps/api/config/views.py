"""HTTP entry points: the GraphQL endpoint, health check and OAuth callbacks.

GraphQL is the API. The only non-GraphQL routes are the health probe and the
OAuth redirect callbacks, which browsers must hit directly.
"""

import logging
from typing import Any

from django.conf import settings
from django.core.exceptions import ValidationError as DjangoValidationError
from django.http import HttpRequest, HttpResponse, JsonResponse
from django_ratelimit.core import is_ratelimited
from graphene_django.views import GraphQLView

from core.errors import AppError, RateLimitError
from core.graphql import to_graphql_error

logger = logging.getLogger(__name__)

# Operations that authenticate a caller get the tighter limit the Express API
# applied to /api/v1/auth.
AUTH_OPERATIONS = ("login", "register", "refreshTokens")


class ThmsGraphQLView(GraphQLView):
    """GraphQL endpoint with per-IP rate limiting and domain-aware error codes."""

    def dispatch(self, request: HttpRequest, *args: Any, **kwargs: Any) -> HttpResponse:
        """Applies the request rate limits before handing off to the GraphQL handler."""
        if settings.RATELIMIT_ENABLE and request.method == "POST":
            body = request.body.decode("utf-8", errors="ignore")
            rate = (
                settings.AUTH_RATE_LIMIT
                if any(op in body for op in AUTH_OPERATIONS)
                else settings.GRAPHQL_RATE_LIMIT
            )
            group = "graphql-auth" if rate == settings.AUTH_RATE_LIMIT else "graphql"
            try:
                limited = is_ratelimited(
                    request=request, group=group, key="ip", rate=rate, method=["POST"], increment=True
                )
            except Exception:
                # The limiter's cache is unreachable. Serving the request is the
                # lesser failure — refusing would take the whole API down with it.
                logger.warning("Rate limit backend unavailable; allowing request", exc_info=True)
                limited = False
            if limited:
                error = RateLimitError()
                return JsonResponse(
                    {
                        "errors": [{"message": error.message, "extensions": {"code": error.code}}],
                        "data": None,
                    },
                    status=429,
                )
        return super().dispatch(request, *args, **kwargs)

    @staticmethod
    def format_error(error: Exception) -> dict[str, Any]:
        """Returns the error with `extensions.code` set; unexpected errors are logged and masked."""
        original = getattr(error, "original_error", None)
        if original is None:
            return GraphQLView.format_error(error)
        if not isinstance(original, (AppError, DjangoValidationError)):
            logger.exception("Unhandled GraphQL error", exc_info=original)
        return GraphQLView.format_error(to_graphql_error(original))


def health(request: HttpRequest) -> JsonResponse:
    """Returns a liveness payload for container health checks."""
    from django.utils import timezone

    return JsonResponse({"status": "ok", "timestamp": timezone.now().isoformat()})
