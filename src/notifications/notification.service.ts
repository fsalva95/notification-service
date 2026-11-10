import { randomUUID } from 'node:crypto';
import type { Logger } from '../logger.ts';
import type { NotificationRepository } from './notification.repository.ts';
import type { NotificationSender } from './notification.sender.ts';
import type { NewNotification, Notification } from './notification.types.ts';

export type NotificationService = ReturnType<typeof createNotificationService>;

// Only the id and the channel reach the logs: recipient and message are personal data.
const logFields = ({ id, channel }: Notification) => ({ notificationId: id, channel });

export function createNotificationService(
  repository: NotificationRepository,
  sender: NotificationSender,
  logger: Logger,
) {
  async function deliver(notification: Notification) {
    try {
      await sender.send(notification);
    } catch (error) {
      logger.error('notification failed', { ...logFields(notification), error });
      repository.save({ ...notification, status: 'failed' });
      return;
    }
    repository.save({ ...notification, status: 'sent' });
    logger.info('notification sent', logFields(notification));
  }

  return {
    create(input: NewNotification): Notification {
      const notification: Notification = { ...input, id: randomUUID(), status: 'queued' };
      repository.save(notification);
      logger.info('notification queued', logFields(notification));
      // Fire and forget: the HTTP response must not wait for the send.
      void deliver(notification);
      return notification;
    },

    get(id: string): Notification | undefined {
      return repository.findById(id);
    },
  };
}
