# Notification Service

Small REST notification service (Node.js + TypeScript). Before writing code, read [docs/SPEC.md](../docs/SPEC.md) (requirements, decisions, acceptance checklist) and [openapi.yaml](../openapi.yaml) (API contract, source of truth).

## Working rules
- Contract first: change `openapi.yaml` before changing behaviour. Never add endpoints, fields or status codes that are not in the contract.
- Work in small vertical slices. After each one run `npm run typecheck && npm test`; a task is not done while either fails.
- Stay in scope: no database, auth, Docker, extra endpoints or dependencies beyond the stack below without asking.
- Install packages with `npm install <pkg>` so npm writes the resolved versions; never hand-write versions.
- Write code, comments, README and commit messages in English.

## Stack
Node >= 22.18, TypeScript (ESM), Express, `express-openapi-validator`, Vitest, Supertest. In-memory storage only. Check the validator's README and peer dependencies before picking the Express major version.

## Layout
```
src/
  server.ts                      only file that calls listen(); PORT env, default 3000
  app.ts                         createApp(deps): validator, routes, error handler
  logger.ts                      Logger interface + JSON-lines implementation
  notifications/
    notification.types.ts        Notification, Channel, Status
    notification.repository.ts   in-memory store (interface + implementation)
    notification.sender.ts       sender interface + simulated implementation
    notification.service.ts      create / get, status transitions
    notification.routes.ts       thin HTTP layer
  http/error-handler.ts          maps every error to the contract's Error schema
  http/request-logger.ts         one log line per completed request
  http/cors.ts                   CORS headers and preflight, so Swagger UI can call the API
test/                            Supertest API tests + service unit tests
openapi.yaml
```

## Build and test
- `npm run dev`: watch mode (Node runs `.ts` directly)
- `npm run typecheck`: `tsc --noEmit` over `src` and `test`
- `npm test`: Vitest, single run
- `npm start`: builds to `dist/`, then runs `dist/server.js`

## Conventions
- Layers: routes (HTTP only) -> service (rules) -> repository and sender (ports). The service never imports Express.
- `createApp(deps)` receives repository, sender and logger so tests can inject fakes. Resolve `openapi.yaml` from `import.meta.url`.
- All request validation comes from `openapi.yaml`; do not duplicate its rules in code. Enable response validation in tests.
- Every error response (validation, malformed JSON, 404, unexpected) uses the `Error` schema from the contract and never leaks stack traces.
- Logs are structured JSON lines written through the injected `Logger`. Never log `recipient` or `message`: they are personal data.
- POST returns `queued` immediately; the simulated send runs afterwards and moves the status to `sent` or `failed`. Statuses are never skipped or reverted.
- Tests are deterministic: inject the sender, no randomness, no real sleeps. Cover happy path, each validation rule, 404, queued -> sent, queued -> failed.
