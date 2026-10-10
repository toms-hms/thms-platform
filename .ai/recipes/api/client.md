---
name: api-client
description: Guide for <app>/clients/<vendor>_client.py — classes wrapping exactly one third-party SDK or HTTP API (OpenAI, S3, Google, Microsoft); lazy SDK creation, typed inputs and outputs, no business logic, used only by services.
---

# API Client

A client is the only place a vendor SDK or vendor HTTP API is touched. Each is a
class in `<app>/clients/<vendor>_client.py`, or `core/clients/` when several apps
use it: `openai_client.py` → `OpenAIClient`, `s3_client.py` → `S3Client`.

```python
class OpenAIClient:
    """Chat completions and image generation against the OpenAI API."""

    def __init__(self, *, api_key: str | None = None) -> None:
        self.api_key = api_key or settings.OPENAI_API_KEY
        self._sdk: OpenAI | None = None

    @property
    def sdk(self) -> OpenAI:
        """Returns the OpenAI SDK client, creating it on first use. Raises when no key is configured."""
        if self._sdk is None:
            if not self.api_key:
                raise BadRequestError("OpenAI API key not configured")
            self._sdk = OpenAI(api_key=self.api_key)
        return self._sdk

    def chat(self, *, model: str, messages: list[dict[str, Any]], tools: list[dict[str, Any]] | None = None) -> Any:
        """Returns the first choice's message from a chat completion."""
        return self.sdk.chat.completions.create(model=model, messages=messages, tools=tools).choices[0].message
```

## Rules

- **One vendor per client.** The vendor's packages (`openai`, `boto3`, `googleapiclient`, …) and its raw HTTP URLs appear in this file and nowhere else.
- **Create the SDK lazily** in a property, so constructing the client, and any service holding it, has no side effects and needs no configuration.
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
