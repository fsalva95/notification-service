# Notification Service: Specification

**Objective**
Build a small notification service using Node.js and TypeScript. Expected effort: approximately 2 hours.

**Requirements**
Implement the following REST API:
- `POST /notifications` - recipient, channel (email/sms/push), message. Returns id and queued status.
- `GET /notifications/{id}` - returns id, channel and current status.

**Behavior**
When a notification is created: store it, simulate sending it, and update its status.
Statuses: queued, sent, failed.

**Optional Bonus: API Contract First Design**
Define the API using OpenAPI (Swagger) and use the specification to validate incoming requests.
If OpenAPI is used, invalid requests should be rejected with appropriate error messages and status codes.
Examples of validation:
- Required fields are present
- Supported notification channels only (email, sms, push)
- Message is not empty
- Request payload matches the API schema

**Technical Expectations**
- Node.js + TypeScript
- Clear project structure
- Basic validation and error handling
- In-memory storage is sufficient (no database required)
- At least a few meaningful tests
- Clear README with instructions
- Any framework is allowed (Express, Fastify, NestJS, etc.)

**AI Usage**
AI tools are allowed and encouraged. Include a short note covering:
- Which AI tools you used
- What tasks AI assisted with
- One example of AI-generated code you accepted
- One example you modified or rejected
- How you validated the final solution

**Deliverables**
- Source code
- README with setup/run instructions
- AI usage notes

## Decisions

- `POST /notifications` answers `201 Created` with `Location: /notifications/{id}` and body `{ id, status: "queued" }`. The response is sent before the simulated send completes.
- `GET /notifications/{id}` answers `200` with exactly `{ id, channel, status }`; any unknown id answers `404`.
- Lifecycle: `queued` -> `sent` | `failed`. Both are terminal.
- Sending is simulated and asynchronous behind an injectable sender. The default sender waits 500 ms and fails for a share of sends set by `FAILURE_RATE` (0 to 1, default 0.2). Tests inject a deterministic fake.
- Validation lives in `openapi.yaml`: `recipient` (up to 320 characters) and `message` (up to 1000) are non-blank strings (whitespace only counts as empty), `channel` is one of `email`, `sms`, `push`, unknown properties are rejected. There is no per-channel recipient format check (not required).
- Errors: `400` for schema violations and malformed JSON, `415` for a non-JSON content type, `404` for unknown id or route, `500` for anything unexpected. All use the `Error` schema.
- Out of scope: persistence, auth, retries, rate limiting, Docker, list endpoint, real providers.

## Acceptance checklist

- [x] `POST /notifications` with a valid body returns `201` and `{ id, status: "queued" }`.
- [x] `GET /notifications/{id}` returns `{ id, channel, status }` and the status ends as `sent` or `failed`.
- [x] `GET /notifications/unknown` returns `404` with the `Error` schema.
- [x] `POST` returns `400` with the `Error` schema for: missing field, unknown channel, empty message, blank message, wrong type, extra property, value over the length limit, malformed JSON.
- [x] Request validation is driven by `openapi.yaml` (no duplicated rules in code).
- [x] Tests cover the cases above plus `queued` -> `sent` and `queued` -> `failed`; `npm run typecheck` and `npm test` pass.
- [x] `npm start` boots and both endpoints work with the curl examples in the README.
- [x] README has setup, run, test, curl examples, design decisions, trade-offs and next steps.
- [x] `AI_USAGE.md` covers the five required points, written from real events.
