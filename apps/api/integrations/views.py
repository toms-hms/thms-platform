"""OAuth redirect callbacks.

These are plain HTTP views, not GraphQL: the provider redirects the user's
browser here, and we redirect on to the web app once the tokens are stored.
The `state` parameter carries the id of the user who started the flow.
"""

from django.conf import settings
from django.http import HttpRequest, HttpResponse, HttpResponseRedirect
from django.views.decorators.http import require_GET

from integrations import services


def _redirect_to_web(provider: str, status: str) -> HttpResponseRedirect:
    """Returns a redirect back to the web app's integrations page carrying the outcome."""
    origin = settings.CORS_ALLOWED_ORIGINS[0] if settings.CORS_ALLOWED_ORIGINS else "http://localhost:3000"
    return HttpResponseRedirect(f"{origin}/integrations?status={status}&provider={provider}")


@require_GET
def google_callback(request: HttpRequest) -> HttpResponse:
    """Exchanges the Google authorization code for tokens and stores the integration."""
    code, state = request.GET.get("code"), request.GET.get("state")
    if not code or not state:
        return _redirect_to_web("google", "failed")
    services.handle_google_callback(code=code, user_id=state)
    return _redirect_to_web("google", "connected")


@require_GET
def microsoft_callback(request: HttpRequest) -> HttpResponse:
    """Exchanges the Microsoft authorization code for tokens and stores the integration."""
    code, state = request.GET.get("code"), request.GET.get("state")
    if not code or not state:
        return _redirect_to_web("microsoft", "failed")
    services.handle_microsoft_callback(code=code, user_id=state)
    return _redirect_to_web("microsoft", "connected")
