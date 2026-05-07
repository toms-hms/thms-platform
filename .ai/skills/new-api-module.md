Create a new API module following the project's module pattern.

Steps:
1. Create `src/{module}/schema.ts` with Zod schemas named `CreateXSchema`, `UpdateXSchema`
2. Create `src/{module}/service.ts` with async functions: `listX`, `getX`, `createX`, `updateX`, `deleteX`. Throw from `utils/errors`. No Express types.
3. Create `src/{module}/route.ts` — import from `./schema` and `./service`. Apply `authenticateJWT`. Use `(req as unknown as AuthenticatedRequest).user.userId` for user ID. Each handler: call service, return `res.json({ data: result })`, pass errors to `next(err)`.
4. Register router in `src/app.ts`
5. Create `src/__tests__/{module}.test.ts` — register + login test user in `beforeAll`, clean up homes before users in `afterAll`
