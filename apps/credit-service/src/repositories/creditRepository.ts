import type { Pool, PoolClient } from 'pg';

export interface CreditTransactionRecord {
  id: string;
  user_id: string;
  amount: number;
  type: 'debit' | 'credit';
  reason: string;
  request_id?: string;
  balance_after: number;
  created_at: Date;
}

export class CreditRepository {
  constructor(private readonly db: Pool) {}

  async getBalance(userId: string): Promise<number> {
    const result = await this.db.query<{ credit_balance: number }>(
      'SELECT credit_balance FROM users WHERE id = $1',
      [userId],
    );
    return result.rows[0]?.credit_balance ?? 0;
  }

  async deductCredits(client: PoolClient, userId: string, amount: number): Promise<number | null> {
    const result = await client.query<{ credit_balance: number }>(
      `UPDATE users SET credit_balance = credit_balance - $1, updated_at = NOW()
       WHERE id = $2 AND credit_balance >= $1
       RETURNING credit_balance`,
      [amount, userId],
    );
    return result.rows[0]?.credit_balance ?? null;
  }

  async addCredits(client: PoolClient, userId: string, amount: number): Promise<number | null> {
    const result = await client.query<{ credit_balance: number }>(
      `UPDATE users SET credit_balance = credit_balance + $1, updated_at = NOW()
       WHERE id = $2
       RETURNING credit_balance`,
      [amount, userId],
    );
    return result.rows[0]?.credit_balance ?? null;
  }

  async insertTransaction(client: PoolClient, tx: Omit<CreditTransactionRecord, 'created_at'>): Promise<void> {
    await client.query(
      `INSERT INTO credit_transactions (id, user_id, amount, type, reason, request_id, balance_after)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [tx.id, tx.user_id, tx.amount, tx.type, tx.reason, tx.request_id, tx.balance_after],
    );
  }

  async transactionExists(requestId: string): Promise<boolean> {
    const result = await this.db.query<{ exists: boolean }>(
      'SELECT EXISTS(SELECT 1 FROM credit_transactions WHERE request_id = $1)',
      [requestId],
    );
    return result.rows[0]?.exists ?? false;
  }

  async getTransactions(userId: string, limit: number, offset: number): Promise<CreditTransactionRecord[]> {
    const result = await this.db.query<CreditTransactionRecord>(
      `SELECT id, user_id, amount, type, reason, request_id, balance_after, created_at
       FROM credit_transactions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    );
    return result.rows;
  }

  async getClient(): Promise<PoolClient> {
    return this.db.connect();
  }
}
