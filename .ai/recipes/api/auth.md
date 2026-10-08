---
name: api-auth
description: Guide for authentication — the JWT contract, password hashing, and how request.user is resolved.
---

# Authentication

Stateless JWT, not Django sessions. The contract is unchanged from the API this replaced, so tokens and password hashes written by it still work.

## The token pair

| Token | Claims | Secret | Lifetime |
| --- | --- | --- | --- |
| Access | `sub`, `email`, `role`, `jti`, `iat`, `exp` | `JWT_SECRET` | `JWT_EXPIRES_IN` (15m) |
| Refresh | `sub`, `jti`, `iat`, `exp` | `JWT_REFRESH_SECRET` | `JWT_REFRESH_EXPIRES_IN` (7d) |

`sub` is the user's UUID as a string. `jti` is random per token, so two tokens issued in the same second still differ.

`login`, `register` and `refreshTokens` issue a pair and store the SHA-256 digest of the new refresh token on `User.refresh_token_hash` (`core.hashing.hash_token`). Only the most recently issued refresh token is accepted: rotating replaces the digest, and `logout` clears it. A refresh token is a high-entropy secret, so it uses a fast digest with a constant-time compare (`verify_token`), never a password hasher.

Durations are Node-style strings (`15m`, `7d`, `3600`) — `core.jwt_utils.parse_duration` reads them.

## Passwords

Django's password hashers (`PASSWORD_HASHERS` default, PBKDF2 first; MD5 under `DJANGO_ENV=test` for speed). Set and check passwords through the model:

- `User.objects.create_user(email, password, ...)` / `user.set_password(...)` to store one.
- `user.check_password(...)` to verify one. It also upgrades the hash when the configured hasher changes.
- `make_password(...)` only where no user instance exists yet (factories, seed data).

Never store, compare or log a raw password.

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
