import type { Pool } from 'pg';
import type { User } from '@ai-gateway/types';

export interface UserRow {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  plan_id: string;
  credit_balance: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const toUser = (row: UserRow): User & { passwordHash: string } => ({
  id: row.id,
  email: row.email,
  name: row.name,
  passwordHash: row.password_hash,
  planId: row.plan_id as User['planId'],
  creditBalance: row.credit_balance,
  isActive: row.is_active,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export class UserRepository {
  constructor(private readonly db: Pool) {}

  async findByEmail(email: string): Promise<(User & { passwordHash: string }) | null> {
    const result = await this.db.query<UserRow>(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [email],
    );
    return result.rows[0] ? toUser(result.rows[0]) : null;
  }

  async findById(id: string): Promise<(User & { passwordHash: string }) | null> {
    const result = await this.db.query<UserRow>(
      'SELECT * FROM users WHERE id = $1 AND is_active = true',
      [id],
    );
    return result.rows[0] ? toUser(result.rows[0]) : null;
  }

  async create(data: {
    id: string;
    email: string;
    name: string;
    passwordHash: string;
    planId: string;
    creditBalance: number;
  }): Promise<User> {
    const result = await this.db.query<UserRow>(
      `INSERT INTO users (id, email, name, password_hash, plan_id, credit_balance)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [data.id, data.email, data.name, data.passwordHash, data.planId, data.creditBalance],
    );
    const row = result.rows[0];
    if (!row) throw new Error('Failed to create user');
    const user = toUser(row);
    return user;
  }

  async emailExists(email: string): Promise<boolean> {
    const result = await this.db.query<{ count: string }>(
      'SELECT COUNT(*) as count FROM users WHERE email = $1',
      [email],
    );
    return parseInt(result.rows[0]?.count ?? '0', 10) > 0;
  }
}
