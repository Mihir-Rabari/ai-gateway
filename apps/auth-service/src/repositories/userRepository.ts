import type { Pool } from 'pg';

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  planId: 'free' | 'pro' | 'max';
  creditBalance: number;
  createdAt: Date;
  updatedAt: Date;
}

export class UserRepository {
  constructor(private readonly db: Pool) {}

  async findByEmail(email: string): Promise<UserRecord | null> {
    const result = await this.db.query<UserRecord>(
      'SELECT id, email, name, password_hash as "passwordHash", plan_id as "planId", credit_balance as "creditBalance", created_at as "createdAt", updated_at as "updatedAt" FROM users WHERE email = $1 AND is_active = true',
      [email.toLowerCase()]
    );
    return result.rows[0] ?? null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    const result = await this.db.query<UserRecord>(
      'SELECT id, email, name, password_hash as "passwordHash", plan_id as "planId", credit_balance as "creditBalance", created_at as "createdAt", updated_at as "updatedAt" FROM users WHERE id = $1 AND is_active = true',
      [id]
    );
    return result.rows[0] ?? null;
  }

  async create(data: {
    id: string;
    email: string;
    name: string;
    passwordHash: string;
    planId: string;
    creditBalance: number;
  }): Promise<UserRecord> {
    const result = await this.db.query<UserRecord>(
      `INSERT INTO users (id, email, name, password_hash, plan_id, credit_balance)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, name, password_hash as "passwordHash", plan_id as "planId", credit_balance as "creditBalance", created_at as "createdAt", updated_at as "updatedAt"`,
      [data.id, data.email.toLowerCase(), data.name, data.passwordHash, data.planId, data.creditBalance]
    );
    return result.rows[0]!;
  }

  async emailExists(email: string): Promise<boolean> {
    const result = await this.db.query<{ exists: boolean }>(
      'SELECT EXISTS(SELECT 1 FROM users WHERE email = $1) as exists',
      [email.toLowerCase()]
    );
    return result.rows[0]?.exists ?? false;
  }
}
