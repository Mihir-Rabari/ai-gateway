import { randomUUID } from 'crypto';
import { KAFKA_TOPICS } from '@ai-gateway/config';
import type { AuthEvent } from '@ai-gateway/types';

type PublishFn = (topic: string, message: object) => Promise<void>;

const buildEvent = (type: AuthEvent['type'], userId: string, extra?: object): AuthEvent => ({
  eventId: randomUUID(),
  topic: 'auth.events',
  type,
  userId,
  timestamp: new Date().toISOString(),
  version: '1.0',
  ...extra,
});

export const authEvents = {
  userCreated: (publish: PublishFn, userId: string, email: string) =>
    publish(KAFKA_TOPICS.AUTH, buildEvent('user.created', userId, { email })),

  userLogin: (publish: PublishFn, userId: string) =>
    publish(KAFKA_TOPICS.AUTH, buildEvent('user.login', userId)),

  userLogout: (publish: PublishFn, userId: string) =>
    publish(KAFKA_TOPICS.AUTH, buildEvent('user.logout', userId)),
};
