---
name: api-service
description: Guide for the service layer — what belongs in a service, and what belongs in a manager or a resolver.
---

# API Service

Services orchestrate writes. They are plain module-level functions, not classes.

```python
def create_home(user_id: str, data: dict[str, Any]) -> Home:
    """Creates a home owned by the user and grants them access."""
    home = Home.objects.create(
        name=data["name"],
        address1=data["address1"],
        address2=data.get("address2"),
        ...
    )
    UserHome.objects.create(user_id=user_id, home=home, role=HomeRole.OWNER)
    permissions.grant(user_id, home.pk)
    return home
```

## What belongs here

- A write that touches more than one table or more than one app.
- Rules the database cannot express — "only an owner may delete a home".
- Permission-cache maintenance after a membership change.
- Calls to a third party (OpenAI, Gmail) and whatever they imply for our own tables.

## What does not

- **Reads.** A resolver calls the manager directly. There is no `get_job` service.
- **Query construction.** If a function is mostly `.filter(...)`, it belongs in the manager.
- **Auth checks.** The resolver gates access before calling the service. A service may re-check ownership where it is part of the rule itself (`delete_home` checks OWNER, not access).

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
