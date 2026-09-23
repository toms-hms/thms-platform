---
name: api-permissioning
description: Guide for permissioning a resource — has_permission, list_for_user, the permission cache, and how resolvers gate access.
---

# Permissioning

Two separate paths, deliberately not blurred together:

- **Single object** — `permissions.require(Manager.objects, user_id, resource_id)`, which calls `has_permission`.
- **Collections** — `permissions.list_for_user(Manager.objects, user_id, role, **filters)`, which calls `list_for_user`.

A permission check answers one boolean question about one row. A list query applies a visibility filter in SQL. Never implement one in terms of the other.

## The two manager methods

### `has_permission(user_id, resource_id) -> bool`

- A pure data check for a single row. **No role branching** — admin access is handled by the caller and by `list_for_user`.
- Query only what the check needs, or delegate to the owning parent.
- Returns `False` for an unknown id — never raises.

```python
def has_permission(self, user_id: str, resource_id: str) -> bool:
    """Returns True when the user belongs to the home the job sits under."""
    job = self.filter(pk=resource_id).only("home_id").first()
    if not job:
        return False
    return Home.objects.has_permission(user_id, job.home_id)
```

### `list_for_user(user_id, role, **filters) -> QuerySet`

- The visibility predicate for collections, expressed as a queryset filter.
- This is where ADMIN is allowed to see everything, explicitly.
- Raises `NotFoundError` when a caller filters by a parent they cannot see, rather than silently returning nothing.

```python
def list_for_user(self, user_id: str, role: str, **filters) -> models.QuerySet:
    """Returns jobs on the given home for a member; every matching job for an ADMIN."""
    if role == UserRole.ADMIN:
        return self.all()
    return self.filter(home__memberships__user_id=user_id)
```

## Ownership chain

```
Contractor        → always true (the directory is public to signed-in users; writes are admin-only)
Home              → UserHome membership
Job               → delegates to Home via job.home_id
JobContractor     → delegates to Job
Quote             → delegates to Job
Communication     → delegates to Job
UserContractor    → row belongs to the user
Integration       → row belongs to the user (checked in the service)
```

## Gating a resolver

```python
@login_required
def resolve_job(self, info, job_id: str):
    """Returns one job after checking the caller's access."""
    permissions.require(Job.objects, current_user(info).pk, job_id)
    return Job.objects.get_or_404(pk=job_id)
```

- `@login_required` — the caller must be authenticated. `UNAUTHORIZED` otherwise.
- `@admin_required` — the caller must hold ADMIN. `FORBIDDEN` otherwise.
- `permissions.require(...)` — raises `ForbiddenError` for a caller without access to this row.

A mutation that writes to a child of a job checks the **job**, before touching anything:

```python
@login_required
def mutate(self, info, job_id: str, **data):
    """Creates the quote after checking the caller's access to the job."""
    permissions.require(Job.objects, current_user(info).pk, job_id)
    return CreateQuote(quote=services.create_quote(job_id, data))
```

## The cache

`core.permissions` caches a **positive** result for `PERMISSION_CACHE_TIMEOUT` seconds. Denials are never cached, so granting access takes effect immediately.

Keep it honest from services whenever access changes:

```python
permissions.grant(user_id, home.pk)        # creator, or a new member
permissions.invalidate(user_id, home_id)   # member removed, or resource deleted
```

The cache is an optimisation, not the authority: if the backend is unreachable the check falls through to the database. Never add a code path where a cache miss means "denied".
