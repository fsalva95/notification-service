import { setTimeout as sleep } from 'node:timers/promises';
import type { Notification } from './notification.types.ts';

export interface NotificationSender {
  send(notification: Notification): Promise<void>;
}

export function createSimulatedSender(failureRate: number): NotificationSender {
  return {
    async send() {
      await sleep(500);
      if (Math.random() < failureRate) throw new Error('Simulated delivery failure');
    },
  };
}
