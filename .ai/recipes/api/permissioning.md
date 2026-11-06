---
name: api-permissioning
description: Guide for access control — the Permission names and role map in core/services/permission_service.py (PermissionService), @authorize / @owner_required on resolvers, visible_to / owned_by for collections, and the membership cache.
---

# Permissioning

The **home** is the access boundary. A user reaches home-scoped data through
their `UserHome` membership, whose role grants a set of named permissions.
Access is declared on the resolver. Managers and querysets make no decisions.

| Piece | Lives in | Does |
| --- | --- | --- |
| `Permission` enum | `core/services/permission_service.py` | The named capabilities, e.g. `jobs.view` or `quotes.edit` |
| `PermissionService.role_permissions(role)` | `core/services/permission_service.py` | OWNER: all. MEMBER: all except `HOME_DELETE` |
| `PermissionService.can(user, permission, home_id)` | `core/services/permission_service.py` | **The only decision function.** ADMIN gets True here, explicitly |
| `@authorize(...)` | `core/graphql.py` | Gates a resolver on one row's home |
| `@owner_required(...)` | `core/graphql.py` | Gates a resolver on a user-owned row |
| `visible_to(user, permission)` | `HomeScopedQuerySet` | Scopes a collection to homes granting the permission |
| `owned_by(user)` | `UserOwnedQuerySet` | Scopes a collection to the user's own rows |

## Gating a resolver on one row

```python
@authorize(Permission.QUOTES_EDIT, resource=Quote, arg="quote_id")
def mutate(self, info, quote_id: str, **data):
    """Applies the update to the quote."""
    return UpdateQuote(quote=QuoteService().update(quote_id=quote_id, **data))
```

- `resource` is the model whose row the argument names. `arg` is the argument's snake_case name.
  The decorator resolves the row's home through `home_id_path` and calls `can()`.
- **Creating a child checks the parent:** `createQuote(jobId)` uses `resource=Job, arg="job_id"`,
  and `createJob(homeId)` uses `resource=Home, arg="home_id"`.
- A missing row is `FORBIDDEN`, the same as a row the caller cannot see.
- `@authorize` implies `@login_required`. Do not stack them.
- **Choosing the permission:** reads use `*_VIEW` and writes use `*_EDIT`, for the area the data
  belongs to. Images, AI generations and assignments belong to jobs. Sending or drafting email
  belongs to communications. Deleting a home is `HOME_DELETE`. Adding or removing members is
  `HOME_MANAGE_MEMBERS`.

## Collections

```python
@login_required
def resolve_jobs(self, info, home_ids=None, statuses=None):
    """Returns the jobs the caller can see, narrowed by homes and statuses."""
    return (
        Job.objects.visible_to(current_user(info), Permission.JOBS_VIEW)
        .filter_home_ids(home_ids)
        .filter_statuses(statuses)
    )

@login_required
def resolve_quotes(self, info, job_ids: list[str]):
    """Returns the quotes on the jobs the caller can see."""
    return Quote.objects.filter_job_ids(job_ids).select_related("contractor").visible_to(
        current_user(info), Permission.QUOTES_VIEW
    )
```

- **A list resolver is `@login_required` and scopes with `visible_to` or `owned_by`.** Never
  `@authorize`, and never `Model.objects.all()`.
- **Id arguments narrow, they never widen.** An id the caller cannot see drops out of the
  result. It is not FORBIDDEN, so a list never reveals whether a row exists.
- This holds for lists under a parent too: `quotes(jobIds)` filters by the job ids, then
  scopes with `visible_to`.

## User-owned rows

```python
@owner_required(resource=UserContractor, arg="user_contractor_id")
```

The list resolver returns `Model.objects.owned_by(current_user(info))`.

## Platform-level

The contractor directory is not home-scoped. Reads are `@login_required` and writes are `@admin_required`.

## Adding a permission

Add a member to `Permission`, then decide in `role_permissions` which roles hold it.
Name it `<area>.<verb>` and keep the set small. A permission should correspond to
something an owner would recognise as a page or an action.

## The cache

`PermissionService.membership_role(user_id=..., home_id=...)` caches a member's **role** per (user, home)
for `PERMISSION_CACHE_TIMEOUT` seconds. Non-members are never cached. Any service
that creates, changes or removes a membership calls
`PermissionService().invalidate(user_id=..., home_id=...)` for each affected member. If the cache
is unavailable, checks fall through to the database. A cache miss never means "denied".
