export type Channel = 'email' | 'sms' | 'push';
export type Status = 'queued' | 'sent' | 'failed';

export interface Notification {
  id: string;
  recipient: string;
  channel: Channel;
  message: string;
  status: Status;
}

export type NewNotification = Omit<Notification, 'id' | 'status'>;
