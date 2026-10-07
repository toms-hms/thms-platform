---
name: api-permissioning
description: Guide for access control — the Permission names and role map in core/permissions.py, @authorize / @owner_required on resolvers, visible_to / owned_by for collections, and the membership cache.
---

# Permissioning

The **home** is the access boundary. A user reaches home-scoped data through
their `UserHome` membership, whose role grants a set of named permissions.
Access is declared on the resolver. Managers and querysets make no decisions.

| Piece | Lives in | Does |
| --- | --- | --- |
| `Permission` enum | `core/permissions.py` | The named capabilities, e.g. `jobs.view` or `quotes.edit` |
| `role_permissions(role)` | `core/permissions.py` | OWNER: all. MEMBER: all except `HOME_DELETE` |
| `can(user, permission, home_id)` | `core/permissions.py` | **The only decision function.** ADMIN gets True here, explicitly |
| `@authorize(...)` | `core/graphql.py` | Gates a resolver on one row's home |
| `@owner_required(...)` | `core/graphql.py` | Gates a resolver on a user-owned row |
| `visible_to(user, permission)` | `HomeScopedQuerySet` | Scopes a collection to homes granting the permission |
| `owned_by(user)` | `UserOwnedQuerySet` | Scopes a collection to the user's own rows |

## Gating a resolver on one row

```python
@authorize(Permission.QUOTES_EDIT, resource=Quote, arg="quote_id")
def mutate(self, info, quote_id: str, **data):
    """Applies the update to the quote."""
    return UpdateQuote(quote=services.update_quote(quote_id, data))
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
@authorize(Permission.JOBS_VIEW, resource=Home, arg="home_id", optional=True)
def resolve_jobs(self, info, home_id=None, status=None):
    """Returns the jobs the caller can see, narrowed by home and status."""
    return (
        Job.objects.visible_to(current_user(info), Permission.JOBS_VIEW)
        .filter_home_ids([home_id] if home_id else None)
        .filter_statuses([status] if status else None)
    )
```

- A list without a required parent argument **starts from `visible_to` or `owned_by`**,
  never from `Model.objects.all()`.
- `optional=True` skips the check when the argument is omitted. Use it only where the
  resolver scopes with `visible_to`.
- A list under a required parent (`quotes(jobId)`) is gated by `@authorize` on that
  parent, then calls the manager composition.

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

`membership_role(user_id, home_id)` caches a member's **role** per (user, home)
for `PERMISSION_CACHE_TIMEOUT` seconds. Non-members are never cached. Any service
that creates, changes or removes a membership calls
`permissions.invalidate(user_id, home_id)` for each affected member. If the cache
is unavailable, checks fall through to the database. A cache miss never means "denied".
