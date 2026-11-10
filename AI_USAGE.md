# AI Usage Notes

## 1. AI tools used
- GitHub Copilot, agent mode in VS Code. Model: Claude Sonnet 5.5.

## 2. Tasks AI assisted with
- Specification and setup: drafted `openapi.yaml` from docs/SPEC.md, extended agent instructions.
- Implementation: Express app with the OpenAPI validator, routes, service, in-memory repository, simulated sender and error handler.
- Tests and docs: the Vitest and Supertest suite and the README.

## 3. AI-generated code I accepted
- The delivery design in `src/notifications/notification.service.ts`: `create` stores the notification as `queued` and returns immediately; `deliver` runs in the background and saves `sent` or `failed`. The design was kept as generated (logging came later, see point 4) and is covered by the `queued -> sent` and `queued -> failed` tests.
- The test suite in `test/notifications.test.ts` (17 tests). They are API-level integration tests: the real Express app, validator and service run on the in-memory repository with a fake sender that each test settles, so status transitions are deterministic. Responses are also validated against `openapi.yaml`.


## 4. AI output I modified or rejected
- The error examples the AI wrote in `openapi.yaml` (`path: body.channel`, a generic message) did not match the real responses (`/body/channel`, the validator's own message). A curl smoke test exposed it and the contract was corrected.
- Server logs for monitoring, added at my request. The first version swallowed the delivery error in `deliver` and wrote no structured logs. The AI then added a dependency-free JSON logger (`src/logger.ts`), a log line per request (`src/http/request-logger.ts`) and log lines for each notification state change, including the failure reason. Recipient and message are deliberately kept out of the logs, and a test checks that a failed delivery logs its reason.
- CORS for browser clients, found by trying the API from "Try it out" in the Swagger UI preview: it failed with "Failed to fetch" while the same request worked with curl, because the server sent no CORS headers. The AI added a small middleware (`src/http/cors.ts`) placed before the validator, so the contract is unchanged. A test covers the preflight and the headers on error responses, and the README says to restrict the origins before a real deployment.
- Startup error handling, found when `npm run dev` was started while `npm start` already held port 3000. The first `src/server.ts` ignored the listen error that Express 5 passes to the callback: it printed `server listening` and exited with code 0, so `node --watch` only showed "Waiting for file changes". The AI fixed it: the error is now logged as `server failed to start` (`EADDRINUSE`) and the process exits with code 1.
- Added length limits (`recipient` up to 320 characters, `message` up to 1000, rejected with `400` by the validator), an enum for `code` that matches what the error handler returns, and descriptions of the statuses. Tests cover both over-limit values and the exact limits.
- AI suggestions I did not take, to keep the exercise small: a `.catch` on the background send, validation of `PORT` and `FAILURE_RATE`, a test for the simulated sender and a configurable send delay.
- Readable code over verbose code, at my request: no per-method descriptions, factory functions for the service, repository, sender and logger, and one-line comments only where the reason is not obvious.

## 5. How I validated the final solution
- `npm run typecheck` and `npm run build` pass.
- `npm test`: 17 Vitest and Supertest tests pass with response validation against `openapi.yaml` enabled. They cover the happy path, each validation rule including the length limits, malformed JSON, `415`, `404`, both status transitions and the CORS preflight.
- `npm start` and `npm run dev` exercised with curl: `201` queued, then `sent`, `400` for an invalid channel, `404` for an unknown id.
- Startup failure checked by hand: a second server on an occupied port logs `server failed to start` (`EADDRINUSE`) and exits with code 1.
- A one-off script ran the real simulated sender: `FAILURE_RATE=0` ends `sent`, `1` ends `failed`; wrong types return `400`; a failing repository returns `500` without a stack trace.

