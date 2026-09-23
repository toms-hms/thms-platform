---
name: api-testing
description: Guide for backend tests — structure, what each layer covers, and the GraphQL test client.
---

# API Testing

Django's own test runner and `unittest`-style `TestCase`. No pytest.

```bash
make test-api                                                  # everything, in the container
DJANGO_ENV=test uv run python manage.py test                   # everything, locally
DJANGO_ENV=test uv run python manage.py test jobs              # one app
DJANGO_ENV=test uv run python manage.py test jobs.tests.test_schema.CreateJobTests
```

Each test runs in a transaction that is rolled back afterwards, so there is no cleanup code and no shared-state namespace to manage.

## Structure

```
<app>/tests/
  test_managers.py   queries, permission predicates, visibility
  test_services.py   orchestration, rules the database cannot express
  test_schema.py     the GraphQL surface: auth gates, error codes, happy path
```

## What each layer covers

### `test_managers.py`

- Filters: each one narrows as documented; an empty list matches nothing; an absent filter is a no-op.
- `has_permission`: true for a member, false for a stranger, false for an unknown id.
- `list_for_user`: only visible rows; ADMIN sees everything.

### `test_services.py`

Business rules and multi-step writes: what gets created, what the defaults are, what is rejected, and what happens to the permission cache.

### `test_schema.py`

Runs against the real endpoint over HTTP, so authentication, permissions and error codes are all exercised:

```python
class JobQueryTests(GraphQLTestCase):
    """query job"""

    def setUp(self):
        """Creates a job owned by one user."""
        super().setUp()
        self.user = UserFactory()
        self.job = JobFactory(home=HomeFactory(owner=self.user), created_by=self.user)

    def test_returns_the_job_to_a_member(self):
        """The owner can read their job."""
        data = self.assert_ok(self.execute(JOB, {"jobId": self.job.pk}, token=self.token_for(self.user)))
        self.assertEqual(data["job"]["id"], self.job.pk)

    def test_is_forbidden_for_a_stranger(self):
        """A user outside the home cannot read the job."""
        body = self.execute(JOB, {"jobId": self.job.pk}, token=self.token_for(UserFactory()))
        self.assert_error_code(body, "FORBIDDEN")

    def test_requires_a_token(self):
        """Reading a job without a token is UNAUTHORIZED."""
        self.assert_error_code(self.execute(JOB, {"jobId": self.job.pk}), "UNAUTHORIZED")
```

`GraphQLTestCase` (`core/testing.py`) provides:

| Helper | Does |
| --- | --- |
| `execute(query, variables, token)` | Posts the operation and returns the parsed body |
| `token_for(user)` | Signs an access token for that user |
| `assert_ok(body)` | Asserts there were no errors, returns `data` |
| `assert_error_code(body, code)` | Asserts the operation failed with that code |

Every mutation gets at least: the happy path, `UNAUTHORIZED` without a token, and `FORBIDDEN` for a user who should not reach it.

## Third parties are always mocked

No test may reach OpenAI, Google or object storage. Patch the seam:

```python
with patch.object(services, "get_openai_client", return_value=client):
    result = services.start_diagnose(job.pk)
```

Assert what we sent as well as what we stored — that the recurring-work prompt was used, that the tone reached the system message.

## Naming

- A test class per method or operation, named after it, with a one-line docstring.
- A test name is a sentence about behaviour: `test_rejects_a_duplicate_entry`, not `test_create_2`.
- Each test's docstring says what the behaviour is, not what the code does.
