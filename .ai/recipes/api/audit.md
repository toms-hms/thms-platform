---
name: api-audit
description: Guide for the audit log — what is recorded, how models are registered, and how to read it.
---

# Audit Log

`django-auditlog` records every create, update and delete on the registered domain models, with the acting user and the field-level before/after values.

## Registering a model

In the owning app's `AppConfig.ready()`:

```python
def ready(self) -> None:
    """Registers this app's models with the audit log."""
    from auditlog.registry import auditlog

    from integrations.models import Integration

    # Encrypted tokens are excluded — the log records that a connection
    # changed, never the secret itself.
    auditlog.register(
        Integration, exclude_fields=["access_token_enc", "refresh_token_enc", "updated_at"]
    )
```

Registration lives next to the model it protects, never in settings, so the exclusions are visible to anyone reading the app.

**Always exclude:**

- credentials and secrets — password hashes, encrypted tokens
- `updated_at`, which changes on every write and carries no information

A new model is registered in the same change that adds it.

## The actor

`AuditlogMiddleware` reads `request.user`, which `JWTAuthenticationMiddleware` set from the bearer token — the order in `MIDDLEWARE` matters. A write from a management command or a migration has no actor, and the entry records `None`, which is correct.

## Reading it

Admin-only, through GraphQL:

```graphql
query {
  auditLog(objectType: "job", objectId: "abc123", limit: 50) {
    action objectType objectId objectRepr actorEmail changes timestamp
  }
}
```

`changes` is a field-level map of `[before, after]`. The query is capped at 500 entries and ordered most-recent-first. It is gated with `@admin_required` — do not expose it to ordinary users, and do not add a mutation that edits or deletes entries.
