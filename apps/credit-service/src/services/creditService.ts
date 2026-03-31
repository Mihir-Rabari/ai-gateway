import type { Pool } from 'pg';
import type Redis from 'ioredis';
import { Errors, createLogger, generateId } from '@ai-gateway/utils';
import { KAFKA_TOPICS, getCreditConfig } from '@ai-gateway/config';
import type { CreditEvent } from '@ai-gateway/types';
import { CreditRepository, type CreditTransactionRecord } from '../repositories/creditRepository.js';

const logger = createLogger('credit-service');

export class CreditService {
  private repo: CreditRepository;
  private config = getCreditConfig();

  constructor(
    private readonly db: Pool,
    private readonly redis: Redis,
    private readonly kafkaPublish: (topic: string, msg: object) => Promise<void>,
  ) {
    this.repo = new CreditRepository(db);
  }

  // ─────────────────────────────────────────
  // Get Balance
  // ─────────────────────────────────────────

  async getBalance(userId: string): Promise<number> {
    return this.repo.getBalance(userId);
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
    const lockTtl = this.config.CREDIT_LOCK_TTL_SECONDS ?? 30;

    const balance = await this.getBalance(userId);
    if (balance < amount) throw Errors.INSUFFICIENT_CREDITS(balance, amount);

    const lockValue = JSON.stringify({ amount, lockedAt: Date.now() });

    const LOCK_LUA = `
      local key = KEYS[1]
      local value = ARGV[1]
      local ttl = tonumber(ARGV[2])
      if redis.call('EXISTS', key) == 0 then
        redis.call('SET', key, value)
        redis.call('EXPIRE', key, ttl)
        return 1
      else
        return 0
      end
    `;

    const wasSet = await this.redis.eval(LOCK_LUA, 1, lockKey, lockValue, lockTtl.toString());
    if (wasSet !== 1) throw Errors.CREDIT_LOCK_FAILED();

    void this.publishEvent('credit.locked', userId, amount, requestId);
  }

  // ─────────────────────────────────────────
  // Confirm Deduction
  // ─────────────────────────────────────────

  async confirm(userId: string, requestId: string): Promise<{ balanceAfter: number }> {
    // Idempotency: Check if already processed
    const exists = await this.repo.transactionExists(requestId);
    if (exists) {
      const balance = await this.repo.getBalance(userId);
      return { balanceAfter: balance };
    }

    const lockKey = `credit_lock:${userId}:${requestId}`;
    const lockData = await this.redis.get(lockKey);
    if (!lockData) throw Errors.CREDIT_LOCK_FAILED();

    const { amount } = JSON.parse(lockData) as { amount: number };

    const client = await this.repo.getClient();
    try {
      await client.query('BEGIN');

      const balanceAfter = await this.repo.deductCredits(client, userId, amount);

      if (balanceAfter === null) {
        await client.query('ROLLBACK');
        throw Errors.INSUFFICIENT_CREDITS(0, amount);
      }

      await this.repo.insertTransaction(client, {
        id: generateId(),
        user_id: userId,
        amount: -amount,
        type: 'debit',
        reason: 'request',
        request_id: requestId,
        balance_after: balanceAfter,
      });

      await client.query('COMMIT');
      await this.redis.del(lockKey);

      void this.publishEvent('credit.deducted', userId, amount, requestId, balanceAfter);

      if (balanceAfter < 10) {
        void this.publishEvent('credit.low' as CreditEvent['type'], userId, 0, requestId, balanceAfter);
      }

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
    const exists = await this.repo.transactionExists(requestId);
    if (exists) {
      return; // Already processed/confirmed, nothing to release
    }

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
    const client = await this.repo.getClient();
    try {
      await client.query('BEGIN');

      const balanceAfter = await this.repo.addCredits(client, userId, amount);

      if (balanceAfter === null) throw Errors.USER_NOT_FOUND();

      await this.repo.insertTransaction(client, {
        id: generateId(),
        user_id: userId,
        amount: amount,
        type: 'credit',
        reason: reason,
        balance_after: balanceAfter,
      });

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

  async getTransactions(userId: string, limit = 20, offset = 0): Promise<CreditTransactionRecord[]> {
    return this.repo.getTransactions(userId, limit, offset);
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
    const event = {
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
