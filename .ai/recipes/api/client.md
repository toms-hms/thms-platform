---
name: api-client
description: Guide for <app>/clients/<vendor>_client.py — classes wrapping exactly one third-party SDK or HTTP API (OpenAI, S3, Google, Microsoft); SDK created in the constructor, private state, typed inputs and outputs, no business logic, used only by services.
---

# API Client

A client is the only place a vendor SDK or vendor HTTP API is touched. Each is a
class in `<app>/clients/<vendor>_client.py`, or `core/clients/` when several apps
use it: `openai_client.py` → `OpenAIClient`, `s3_client.py` → `S3Client`.

```python
class OpenAIClient:
    """Chat completions and image generation against the OpenAI API."""

    def __init__(self, *, api_key: str | None = None) -> None:
        """Creates the SDK client. Raises BadRequestError when no key is configured."""
        api_key = api_key or settings.OPENAI_API_KEY
        if not api_key:
            raise BadRequestError("OpenAI API key not configured")
        self._sdk = OpenAI(api_key=api_key)

    def chat(self, *, model: str, messages: list[dict[str, Any]], tools: list[dict[str, Any]] | None = None) -> Any:
        """Returns the first choice's message from a chat completion."""
        return self._sdk.chat.completions.create(model=model, messages=messages, tools=tools).choices[0].message
```

## Rules

- **One vendor per client.** The vendor's packages (`openai`, `boto3`, `googleapiclient`, …) and its raw HTTP URLs appear in this file and nowhere else.
- **Create the SDK in `__init__`** and check its configuration there. Don't defer it behind a property: every service holding a client calls it, so a missing key fails either way.
- **All instance state is private:** `self._sdk`, `self._bucket`. Don't keep a value the SDK already holds, like the API key.
- **Constructor arguments are keyword-only and default to settings,** e.g. `api_key`, `bucket`. Callers override only for a per-call variant, such as a user's own API key.
- **Methods are keyword-only** and named for the vendor operation (`chat`, `presigned_put`, `exchange_code`, `send_message`).
- **Return plain data:** a `@dataclass(frozen=True)` defined in the client module (`GoogleConnection`, `SentMessage`), bytes, or a string. Return the SDK's own object only when the caller needs its shape, like a chat message with tool calls.
- **Raise `BadRequestError`** for missing configuration. Let transport errors propagate.
- **No business logic and no database access.** Clients don't build domain keys, write rows or decide anything. The service that wraps the client does that.
- **Only services use clients,** through their constructor (see `service.md`). Schema, types, views and managers never import a client.

## Testing

Clients are not unit-tested against the vendor. Services are tested with a fake
client: `MagicMock(spec=OpenAIClient)`, with return values set to the client's own
return types. `spec=` makes a renamed or misspelled method fail the test.
