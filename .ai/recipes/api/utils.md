---
name: api-utils
description: Guide for <app>/utils/<topic>_utils.py and core/utils/ — pure, stateless helper functions (prompt building, message encoding, payload shaping, crypto, token hashing) shared by services; no database, no network.
---

# API Utils

A util is a plain function that turns inputs into outputs. Utils live in
`<app>/utils/<topic>_utils.py`, or `core/utils/` when several apps use them:
`prompt_utils.py`, `email_utils.py`, `ai_session_utils.py`, `crypto_utils.py`.

```python
def build_raw_message(*, to: str, subject: str, body_text: str, body_html: str | None = None) -> str:
    """Returns a base64url-encoded RFC 2822 HTML message, as the Gmail send API expects."""
    ...
```

## Rules

- **Functions, not classes.** Constants (prompts, model names, tool definitions) may live alongside them.
- **No database access, no network, no vendor SDKs.** If a helper needs a query, it belongs on a queryset or manager. If it needs I/O, it belongs on a client or service.
- **Reading `settings` is allowed** (e.g. the encryption key); writing state is not.
- **Keyword-only parameters** whenever there is more than one parameter of the same type.
- **Deterministic,** apart from deliberate randomness such as nonces. They are tested directly, with no mocking.
- Name the file after the topic, ending in `_utils.py`. One topic per file.
