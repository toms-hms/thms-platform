"""URL routing.

The API is GraphQL at `/graphql`. The only other routes are the health probe and
the OAuth callbacks, which the provider redirects a browser to and so cannot be
GraphQL operations.
"""

from django.conf import settings
from django.urls import path
from django.views.decorators.csrf import csrf_exempt

from config.views import ThmsGraphQLView, health
from integrations.views import google_callback, microsoft_callback

urlpatterns = [
    path("health", health, name="health"),
    path(
        "graphql",
        csrf_exempt(ThmsGraphQLView.as_view(graphiql=settings.GRAPHIQL_ENABLED)),
        name="graphql",
    ),
    path("api/v1/integrations/email/google/callback", google_callback, name="google-callback"),
    path("api/v1/integrations/email/microsoft/callback", microsoft_callback, name="microsoft-callback"),
]
