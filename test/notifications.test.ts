import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.ts';
import type { Logger } from '../src/logger.ts';
import { createInMemoryRepository } from '../src/notifications/notification.repository.ts';
import type { NotificationSender } from '../src/notifications/notification.sender.ts';

const validBody = { recipient: 'jane@example.com', channel: 'email', message: 'Hello' };

// The sender never settles on its own: the test decides when and how.
function createTestApp() {
  const logs: { level: string; message: string; fields?: Record<string, unknown> }[] = [];
  const logger: Logger = {
    info: (message, fields) => logs.push({ level: 'info', message, fields }),
    error: (message, fields) => logs.push({ level: 'error', message, fields }),
  };

  let finish: (error?: Error) => void = () => {};
  const sender: NotificationSender = {
    send: () =>
      new Promise((resolve, reject) => {
        finish = (error) => (error ? reject(error) : resolve());
      }),
  };
  const app = createApp({ repository: createInMemoryRepository(), sender, logger, validateResponses: true });
  return { app, logs, finish: (error?: Error) => finish(error) };
}

// Lets the service handle the settled send before the next request.
const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('POST /notifications', () => {
  it('returns 201 with the id and the queued status', async () => {
    const { app } = createTestApp();

    const res = await request(app).post('/notifications').send(validBody);

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: expect.any(String), status: 'queued' });
    expect(res.headers.location).toBe(`/notifications/${res.body.id}`);
  });

  it('accepts values at the length limits', async () => {
    const { app } = createTestApp();

    const res = await request(app)
      .post('/notifications')
      .send({ ...validBody, recipient: 'a'.repeat(320), message: 'a'.repeat(1000) });

    expect(res.status).toBe(201);
  });

  it.each([
    ['a missing field', { recipient: 'jane@example.com', channel: 'email' }],
    ['an unknown channel', { ...validBody, channel: 'fax' }],
    ['an empty message', { ...validBody, message: '' }],
    ['a blank message', { ...validBody, message: '   ' }],
    ['an extra property', { ...validBody, priority: 'high' }],
    ['a wrong type', { ...validBody, message: 123 }],
    ['a non-object body', []],
    ['a recipient over 320 characters', { ...validBody, recipient: 'a'.repeat(321) }],
    ['a message over 1000 characters', { ...validBody, message: 'a'.repeat(1001) }],
  ])('rejects %s with 400', async (_case, body) => {
    const { app } = createTestApp();

    const res = await request(app).post('/notifications').send(body);

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('rejects malformed JSON with 400', async () => {
    const { app } = createTestApp();

    const res = await request(app)
      .post('/notifications')
      .set('Content-Type', 'application/json')
      .send('{"recipient":');

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('rejects a non-JSON body with 415', async () => {
    const { app } = createTestApp();

    const res = await request(app).post('/notifications').set('Content-Type', 'text/plain').send('hello');

    expect(res.status).toBe(415);
    expect(res.body).toMatchObject({ code: 'UNSUPPORTED_MEDIA_TYPE' });
  });
});

describe('GET /notifications/:id', () => {
  it('moves from queued to sent', async () => {
    const { app, finish } = createTestApp();
    const { body: created } = await request(app).post('/notifications').send(validBody);

    const queued = await request(app).get(`/notifications/${created.id}`);
    expect(queued.status).toBe(200);
    expect(queued.body).toEqual({ id: created.id, channel: 'email', status: 'queued' });

    finish();
    await flush();

    const sent = await request(app).get(`/notifications/${created.id}`);
    expect(sent.body.status).toBe('sent');
  });

  it('moves from queued to failed and logs the reason', async () => {
    const { app, finish, logs } = createTestApp();
    const { body: created } = await request(app).post('/notifications').send(validBody);

    finish(new Error('provider down'));
    await flush();

    const failed = await request(app).get(`/notifications/${created.id}`);
    expect(failed.body.status).toBe('failed');
    expect(logs).toContainEqual({
      level: 'error',
      message: 'notification failed',
      fields: {
        notificationId: created.id,
        channel: 'email',
        error: expect.objectContaining({ message: 'provider down' }),
      },
    });
  });

  it('returns 404 for an unknown id', async () => {
    const { app } = createTestApp();

    const res = await request(app).get('/notifications/unknown');

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ code: 'NOT_FOUND' });
  });
});

describe('CORS', () => {
  it('answers the preflight and allows browser clients', async () => {
    const { app } = createTestApp();

    const preflight = await request(app)
      .options('/notifications')
      .set('Origin', 'http://localhost:5555')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'content-type');

    expect(preflight.status).toBe(204);
    expect(preflight.headers['access-control-allow-methods']).toContain('POST');
    expect(preflight.headers['access-control-allow-headers']).toMatch(/content-type/i);

    const error = await request(app).get('/notifications/unknown').set('Origin', 'http://localhost:5555');
    expect(error.headers['access-control-allow-origin']).toBe('*');
  });
});
