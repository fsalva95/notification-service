import type { Notification } from './notification.types.ts';

export interface NotificationRepository {
  save(notification: Notification): void;
  findById(id: string): Notification | undefined;
}

export function createInMemoryRepository(): NotificationRepository {
  const items = new Map<string, Notification>();

  return {
    save(notification) {
      items.set(notification.id, notification);
    },
    findById(id) {
      return items.get(id);
    },
  };
}
