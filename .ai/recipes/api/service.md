---
name: api-service
description: Guide for the service layer — what belongs in a service, and what belongs in a manager or a resolver.
---

# API Service

Services orchestrate writes. They are plain module-level functions, not classes.

```python
def create_home(user_id: str, data: dict[str, Any]) -> Home:
    """Creates a home owned by the user."""
    home = Home.objects.create(
        name=data["name"],
        address1=data["address1"],
        address2=data.get("address2"),
        ...
    )
    UserHome.objects.create(user_id=user_id, home=home, role=HomeRole.OWNER)
    permissions.invalidate(user_id, home.pk)
    return home
```

## What belongs here

- A write that touches more than one table or more than one app.
- Rules the database cannot express, e.g. "a contractor cannot be in a rolodex twice".
- Permission-cache maintenance: `permissions.invalidate(user_id, home_id)` after any membership change.
- Calls to a third party (OpenAI, Gmail) and whatever they imply for our own tables.

## What does not

- **Reads.** A resolver calls the manager directly. There is no `get_job` service.
- **Query construction.** If a function is mostly `.filter(...)`, it belongs in a queryset or manager.
- **Access checks.** The resolver's decorator (`@authorize`, `@owner_required`) has already decided. A service assumes the caller may act and does not take a `user_id` just to re-check access.

## Conventions

- Keyword-only arguments for anything with more than one parameter of the same type.
- Raise domain errors from `core.errors` — never return an error value, never raise bare `Exception`.
- Update only the fields the caller supplied:

```python
for field in ("amount", "description", "status"):
    if data.get(field) is not None:
        setattr(quote, field, data[field])
quote.save()
```

- **Never auto-transition a job or contractor status.** The user owns every state change; a service only applies the transition it was asked for.
