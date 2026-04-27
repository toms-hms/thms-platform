---
name: Permission Architecture
description: Decisions made on the permissioning system — hasPermission pattern, caching strategy, route design
type: project
---

Every manager implements two methods. `PermissionService` owns all caching. Routes use `permit` middleware for individual objects.

**Why:** needed a consistent, testable permission layer that doesn't scatter auth logic across services.

**How to apply:** when adding a new resource, run `/permissioning` for the full implementation guide.

## Key decisions

**No role checks in `hasPermission`**
Pure data check only — UserHome membership, ownership, etc. Role bypass is a FE concern. Backend errors out on bad access regardless of role. Prevents bypassing the permission system via role inflation.

**`listForUser(userId, role)` is the only place role matters**
Admin → `findAll()`, user → scoped query. This is a query strategy decision, not a security enforcement point. `hasPermission` remains pure.

**Single routes for admin and regular users**
No separate `/admin/*` routes. Same endpoint, `listForUser` handles the branching internally. Keeps routing simple and FE doesn't need to know about separate endpoints.

**PermissionService owns all caching — not managers**
Managers are pure data. PermissionService wraps manager calls, reads/writes cache. Clean separation: manager knows how to check, service knows when to cache.

**Cache warming on lists**
After `listForUser` returns, PermissionService pre-populates the cache with every returned ID. Subsequent individual access hits (`GET /homes/:id`) are free — no DB query.

**Only cache `true`**
False results always hit DB. Avoids stale denials after membership is granted. Misses are cheap; false negatives blocking legitimate access are the real risk.

**Write-through invalidation**
On `createHome`/`addUserToHome` → `PermissionService.set(userId, resourceId)`.
On `deleteHome`/`removeUserFromHome` → `PermissionService.invalidate(userId, resourceId)`.
Cache stays consistent without TTL races.

**LRU in-memory over Redis**
V0, single server instance — Redis adds operational complexity for no real benefit yet. LRU bounds memory absolutely (max entries eviction). Cache backend is behind an interface so Redis can be swapped in when horizontal scaling is needed. Decision: revisit when running multiple API instances.
