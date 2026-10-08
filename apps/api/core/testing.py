"""Test helpers.

Tests run against the real GraphQL endpoint over HTTP so that authentication,
permission gates and error codes are all exercised the way a client hits them.
"""

import json
from typing import Any

from django.test import Client, TestCase

GRAPHQL_URL = "/graphql"


class GraphQLTestCase(TestCase):
    """Base case providing a GraphQL client and token helpers."""

    def setUp(self) -> None:
        """Creates the HTTP client each test executes through."""
        super().setUp()
        self.client = Client()

    def execute(
        self, query: str, variables: dict[str, Any] | None = None, token: str | None = None
    ) -> dict[str, Any]:
        """Runs a GraphQL document and returns the parsed response body."""
        headers = {"HTTP_AUTHORIZATION": f"Bearer {token}"} if token else {}
        response = self.client.post(
            GRAPHQL_URL,
            data=json.dumps({"query": query, "variables": variables or {}}, default=str),
            content_type="application/json",
            **headers,
        )
        return json.loads(response.content)

    def token_for(self, user) -> str:
        """Returns a signed access token for the user."""
        from core.jwt_utils import sign_access_token

        return sign_access_token(user.pk, user.email, user.role)

    def assert_ok(self, body: dict[str, Any]) -> dict[str, Any]:
        """Asserts the response carries no errors and returns its data."""
        self.assertIsNone(body.get("errors"), f"unexpected GraphQL errors: {body.get('errors')}")
        return body["data"]

    def assert_error_code(self, body: dict[str, Any], code: str) -> None:
        """Asserts the response failed with the given error code."""
        errors = body.get("errors") or []
        self.assertTrue(errors, "expected an error, got none")
        codes = [(error.get("extensions") or {}).get("code") for error in errors]
        self.assertIn(code, codes, f"expected {code}, got {codes}")
