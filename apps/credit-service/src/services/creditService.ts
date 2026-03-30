import { randomUUID } from 'crypto';
import type { Pool } from 'pg';
import type Redis from 'ioredis';
import { Errors, createLogger, calculateCredits, generateId } from '@ai-gateway/utils';
import { KAFKA_TOPICS } from '@ai-gateway/config';
import type { CreditEvent } from '@ai-gateway/types';

const logger = createLogger('credit-service');

export class CreditService {
  constructor(
    private readonly db: Pool,
    private readonly redis: Redis,
    private readonly kafkaPublish: (topic: string, msg: object) => Promise<void>,
  ) {}

  // ─────────────────────────────────────────
  // Get Balance
  // ─────────────────────────────────────────

  async getBalance(userId: string): Promise<number> {
    const result = await this.db.query<{ credit_balance: number }>(
      'SELECT credit_balance FROM users WHERE id = $1',
      [userId],
    );
    return result.rows[0]?.credit_balance ?? 0;
  }

  // ─────────────────────────────────────────
  // Check Credits
  // ─────────────────────────────────────────

  async check(userId: string, requiredCredits: number): Promise<{ sufficient: boolean; balance: number }> {
    const balance = await this.getBalance(userId);
    return { sufficient: balance >= requiredCredits, balance };
  }

  // ─────────────────────────────────────────
  // Lock Credits (atomic reservation)
  // ─────────────────────────────────────────

  async lock(userId: string, requestId: string, amount: number): Promise<void> {
    const lockKey = `credit_lock:${userId}:${requestId}`;
    const lockTtl = parseInt(process.env['CREDIT_LOCK_TTL_SECONDS'] ?? '30', 10);

    const balance = await this.getBalance(userId);
    if (balance < amount) throw Errors.INSUFFICIENT_CREDITS(balance, amount);

    // Atomic lock: SET key value NX EX ttl
    const lockValue = JSON.stringify({ amount, lockedAt: Date.now() });
    // Use setnx + expire atomically via a lua script approach or just setnx then expire
    const wasSet = await this.redis.setnx(lockKey, lockValue);
    if (wasSet === 1) {
      await this.redis.expire(lockKey, lockTtl);
    }
    const locked = wasSet === 1;

    if (!locked) throw Errors.CREDIT_LOCK_FAILED();

    void this.publishEvent('credit.locked', userId, amount, requestId);
  }

  // ─────────────────────────────────────────
  // Confirm Deduction
  // ─────────────────────────────────────────

  async confirm(userId: string, requestId: string): Promise<{ balanceAfter: number }> {
    const lockKey = `credit_lock:${userId}:${requestId}`;
    const lockData = await this.redis.get(lockKey);
    if (!lockData) throw Errors.CREDIT_LOCK_FAILED();

    const { amount } = JSON.parse(lockData) as { amount: number };

    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query<{ credit_balance: number }>(
        `UPDATE users SET credit_balance = credit_balance - $1, updated_at = NOW()
         WHERE id = $2 AND credit_balance >= $1
         RETURNING credit_balance`,
        [amount, userId],
      );

      if (!result.rows[0]) {
        await client.query('ROLLBACK');
        throw Errors.INSUFFICIENT_CREDITS(0, amount);
      }

      const balanceAfter = result.rows[0].credit_balance;

      await client.query(
        `INSERT INTO credit_transactions (id, user_id, amount, type, reason, request_id, balance_after)
         VALUES ($1, $2, $3, 'debit', 'request', $4, $5)`,
        [generateId(), userId, -amount, requestId, balanceAfter],
      );

      await client.query('COMMIT');
      await this.redis.del(lockKey);

      void this.publishEvent('credit.deducted', userId, amount, requestId, balanceAfter);

      return { balanceAfter };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // ─────────────────────────────────────────
  // Release Lock (on request failure)
  // ─────────────────────────────────────────

  async release(userId: string, requestId: string): Promise<void> {
    const lockKey = `credit_lock:${userId}:${requestId}`;
    const lockData = await this.redis.get(lockKey);

    if (lockData) {
      const { amount } = JSON.parse(lockData) as { amount: number };
      await this.redis.del(lockKey);
      void this.publishEvent('credit.released', userId, amount, requestId);
      logger.info({ userId, requestId, amount }, 'Credit lock released');
    }
  }

  // ─────────────────────────────────────────
  // Add Credits
  // ─────────────────────────────────────────

  async addCredits(userId: string, amount: number, reason: string): Promise<{ balanceAfter: number }> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query<{ credit_balance: number }>(
        `UPDATE users SET credit_balance = credit_balance + $1, updated_at = NOW()
         WHERE id = $2
         RETURNING credit_balance`,
        [amount, userId],
      );

      if (!result.rows[0]) throw Errors.USER_NOT_FOUND();

      const balanceAfter = result.rows[0].credit_balance;

      await client.query(
        `INSERT INTO credit_transactions (id, user_id, amount, type, reason, balance_after)
         VALUES ($1, $2, $3, 'credit', $4, $5)`,
        [generateId(), userId, amount, reason, balanceAfter],
      );

      await client.query('COMMIT');
      void this.publishEvent('credit.added', userId, amount, undefined, balanceAfter);

      return { balanceAfter };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // ─────────────────────────────────────────
  // Get Transactions
  // ─────────────────────────────────────────

  async getTransactions(userId: string, limit = 20, offset = 0) {
    const result = await this.db.query(
      `SELECT id, amount, type, reason, request_id, balance_after, created_at
       FROM credit_transactions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    );
    return result.rows;
  }

  // ─────────────────────────────────────────
  // Internal — Publish Kafka Event
  // ─────────────────────────────────────────

  private publishEvent(
    type: CreditEvent['type'],
    userId: string,
    amount: number,
    requestId?: string,
    balanceAfter?: number,
  ): Promise<void> {
    const event: CreditEvent = {
      eventId: generateId(),
      topic: 'credit.events',
      type,
      userId,
      amount,
      requestId,
      balanceAfter,
      timestamp: new Date().toISOString(),
      version: '1.0',
    };
    return this.kafkaPublish(KAFKA_TOPICS.CREDIT, event);
  }
}
