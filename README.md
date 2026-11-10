# Notification Service

Small REST service that accepts notifications, simulates sending them and tracks their status. Node.js, TypeScript, Express, in-memory storage. The API is defined contract first in [openapi.yaml](openapi.yaml).

## Requirements

Node.js >= 22.18

## Setup and run

```bash
npm install
npm start   # builds to dist/ and listens on http://localhost:3000
```

`npm run dev` runs `src/server.ts` directly in watch mode.

| Variable       | Default | Meaning                                         |
| -------------- | ------- | ----------------------------------------------- |
| `PORT`         | `3000`  | HTTP port                                       |
| `FAILURE_RATE` | `0.2`   | Share of simulated sends that fail (0 to 1)     |

## Tests

```bash
npm test            # Vitest + Supertest
npm run typecheck
```

## API

| Method | Path                  | Success                          | Errors     |
| ------ | --------------------- | -------------------------------- | ---------- |
| `POST` | `/notifications`      | `201` `{ id, status: "queued" }` | `400` `415` |
| `GET`  | `/notifications/{id}` | `200` `{ id, channel, status }`  | `404`      |

`channel` is `email`, `sms` or `push`. `recipient` (up to 320 characters) and `message` (up to 1000) must not be blank, and unknown properties are rejected. A notification stays `queued` for about 500 ms, then becomes `sent` or `failed`. Every error has the same body: `{ code, message, details? }`.

```bash
curl -i -X POST http://localhost:3000/notifications \
  -H 'Content-Type: application/json' \
  -d '{"recipient":"jane@example.com","channel":"email","message":"Hello"}'
# 201 Created
# {"id":"3b4f82d5-fe97-427d-b5ce-c2d2559098b6","status":"queued"}

curl http://localhost:3000/notifications/3b4f82d5-fe97-427d-b5ce-c2d2559098b6
# {"id":"3b4f82d5-fe97-427d-b5ce-c2d2559098b6","channel":"email","status":"sent"}

curl -i -X POST http://localhost:3000/notifications \
  -H 'Content-Type: application/json' \
  -d '{"recipient":"jane@example.com","channel":"fax","message":"Hello"}'
# 400 Bad Request
# {"code":"VALIDATION_ERROR","message":"request/body/channel must be equal to one of the allowed values: email, sms, push","details":[...]}
```

To watch the status change, read the notification right after creating it and again a second later:

```bash
ID=$(curl -s -X POST http://localhost:3000/notifications \
  -H 'Content-Type: application/json' \
  -d '{"recipient":"jane@example.com","channel":"email","message":"Hello"}' \
  | sed -E 's/.*"id":"([^"]+)".*/\1/')

curl -s http://localhost:3000/notifications/$ID; echo   # status: queued
sleep 1
curl -s http://localhost:3000/notifications/$ID; echo   # status: sent, or failed (see FAILURE_RATE)
```

## Structure

```
src/
  server.ts                      entrypoint (PORT, FAILURE_RATE)
  app.ts                         createApp(): validator, routes, error handler
  logger.ts                      structured JSON logger
  http/error-handler.ts          maps every error to the contract's Error schema
  http/request-logger.ts         one log line per request
  http/cors.ts                   lets browser clients such as Swagger UI call the API
  notifications/
    notification.types.ts
    notification.routes.ts       HTTP layer
    notification.service.ts      create, get, status transitions
    notification.repository.ts   in-memory store
    notification.sender.ts       simulated delivery
test/notifications.test.ts       API tests
openapi.yaml                     API contract
```

## Design decisions

- **Contract first.** `openapi.yaml` is the source of truth. `express-openapi-validator` rejects invalid requests before they reach the code, so no validation rule is duplicated. Tests also validate responses against the contract.
- **Layers.** Routes (HTTP only) call the service (rules), which uses a repository and a sender (ports). `createApp()` receives both ports, so tests inject fakes and stay deterministic.
- **Asynchronous send.** `POST` answers `201` with `queued` right away. The sender runs in the background and moves the status to `sent` or `failed`. Statuses are never skipped or reverted.
- **Errors.** Validation errors, malformed JSON, unknown ids and unexpected failures share one handler and the contract's `Error` schema. Stack traces are logged, never returned.
- **Logging.** Structured JSON lines on stdout: one per request, one per notification state change, and errors with their reason. Recipient and message are never logged. The logger is injected, so tests can record it.
- **TypeScript.** Node runs `.ts` directly in dev; `npm start` uses the `tsc` build.

## Trade-offs and next steps

- Storage is in memory: data is lost on restart and not shared between instances. The repository interface makes a database a drop-in replacement.
- Delivery is fire and forget: no retries, and sends in flight are lost on shutdown. A queue with a worker would fix both.
- CORS is open to any origin so Swagger UI can call the API; restrict it before a real deployment.
- Not covered: authentication, rate limiting, idempotency keys, per-channel recipient checks (email format, phone numbers), a list endpoint.

AI usage notes: [AI_USAGE.md](AI_USAGE.md).
