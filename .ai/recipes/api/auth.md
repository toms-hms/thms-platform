---
name: api-auth
description: Guide for authentication — the JWT contract, password hashing, and how request.user is resolved.
---

# Authentication

Stateless JWT, not Django sessions. The contract is unchanged from the API this replaced, so tokens and password hashes written by it still work.

## The token pair

| Token | Claims | Secret | Lifetime |
| --- | --- | --- | --- |
| Access | `sub`, `email`, `role`, `iat`, `exp` | `JWT_SECRET` | `JWT_EXPIRES_IN` (15m) |
| Refresh | `sub`, `iat`, `exp` | `JWT_REFRESH_SECRET` | `JWT_REFRESH_EXPIRES_IN` (7d) |

`login`, `register` and `refreshTokens` issue a pair. The bcrypt hash of the refresh token is stored on `User.refresh_token_hash`, so `logout` revokes it by clearing that column.

Durations are Node-style strings (`15m`, `7d`, `3600`) — `core.jwt_utils.parse_duration` reads them.

## Passwords

Hashes are **raw bcrypt** (`$2a$12$…`), not Django's `algorithm$salt$hash` format. `core.hashing` reads and writes that format so rows stay compatible in both directions.

bcrypt only reads the first 72 bytes of its input; bcryptjs truncated silently and the Python library raises, so `core.hashing._prepare` truncates explicitly. This matters because refresh tokens are longer than 72 bytes.

Always go through `hash_password` / `verify_password`. Never call bcrypt directly.

## `request.user`

`core.middleware.JWTAuthenticationMiddleware` reads `Authorization: Bearer <token>`, verifies it, and attaches the user lazily. An absent or invalid token yields an `AnonymousUser` whose `is_authenticated` is `False` — resolvers turn that into `UNAUTHORIZED` through `@login_required`.

The middleware runs **before** `AuditlogMiddleware`, which is what gives audit entries an actor.

## In resolvers

```python
@login_required
def resolve_me(self, info):
    """Returns the authenticated user's own record."""
    return services.get_me(current_user(info).pk)
```

Never read `info.context.user` directly — `current_user(info)` raises the right error when there is no caller.
