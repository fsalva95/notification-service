import { Router } from 'express';
import { HttpError } from '../http/error-handler.ts';
import type { NotificationService } from './notification.service.ts';

export function notificationRoutes(service: NotificationService) {
  const router = Router();

  router.post('/notifications', (req, res) => {
    // The body is already validated against openapi.yaml.
    const { id, status } = service.create(req.body);
    res.status(201).location(`/notifications/${id}`).json({ id, status });
  });

  router.get('/notifications/:id', (req, res) => {
    const notification = service.get(req.params.id);
    if (!notification) throw new HttpError(404, 'Notification not found');

    const { id, channel, status } = notification;
    res.json({ id, channel, status });
  });

  return router;
}
