import { describe, expect, test, vi } from 'vitest';
import { ingestAuthEvent } from '../events/authAuditConsumer.js';
import type { AuthEvent } from '@ai-gateway/types';

describe('ingestAuthEvent', () => {
  test('stores supported auth events into user_events using eventId for idempotency', async () => {
    const query = vi.fn(async () => ({ rowCount: 1 }));
    const logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    const inserted = await ingestAuthEvent(
      { query },
      {
        eventId: 'd44d7c7f-36f8-4ba6-a1ff-a263f8b7e9a2',
        topic: 'auth.events',
        type: 'user.login',
        userId: '89d393d2-3a23-48e7-a6a8-380f5fb39487',
        timestamp: '2026-04-05T12:00:00.000Z',
        version: '1.0',
      } satisfies AuthEvent,
      logger,
    );

    expect(inserted).toBe(true);
    expect(query).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO user_events'), [
      'd44d7c7f-36f8-4ba6-a1ff-a263f8b7e9a2',
      '89d393d2-3a23-48e7-a6a8-380f5fb39487',
      'login',
      '2026-04-05T12:00:00.000Z',
    ]);
  });

  test('skips malformed events that are missing userId', async () => {
    const query = vi.fn(async () => ({ rowCount: 1 }));
    const logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    const inserted = await ingestAuthEvent(
      { query },
      {
        eventId: 'd44d7c7f-36f8-4ba6-a1ff-a263f8b7e9a2',
        topic: 'auth.events',
        type: 'user.login',
        userId: '',
        timestamp: '2026-04-05T12:00:00.000Z',
        version: '1.0',
      } as AuthEvent,
      logger,
    );

    expect(inserted).toBe(false);
    expect(query).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalled();
  });
});
