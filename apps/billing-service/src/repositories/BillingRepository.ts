import type { Pool } from 'pg';

export class BillingRepository {
  constructor(private readonly db: Pool) {}

  async createPendingSubscription(id: string, userId: string, planId: string, razorpaySubscriptionId: string) {
    await this.db.query(
      `INSERT INTO subscriptions (id, user_id, plan_id, status, razorpay_subscription_id)
       VALUES ($1, $2, $3, 'pending', $4)
       ON CONFLICT (user_id) DO UPDATE
       SET plan_id = $3, status = 'pending', razorpay_subscription_id = $4, updated_at = NOW()`,
      [id, userId, planId, razorpaySubscriptionId],
    );
  }

  async getSubscriptionByRazorpayId(razorpaySubscriptionId: string) {
    const result = await this.db.query<{ user_id: string; plan_id: string }>(
      'SELECT user_id, plan_id FROM subscriptions WHERE razorpay_subscription_id = $1',
      [razorpaySubscriptionId],
    );
    return result.rows[0];
  }

  async updateSubscriptionStatus(razorpaySubscriptionId: string, status: string) {
    await this.db.query(
      'UPDATE subscriptions SET status = $1, updated_at = NOW() WHERE razorpay_subscription_id = $2',
      [status, razorpaySubscriptionId],
    );
  }

  async updateUserPlan(userId: string, planId: string) {
    await this.db.query(
      'UPDATE users SET plan_id = $1, updated_at = NOW() WHERE id = $2',
      [planId, userId],
    );
  }

  async getSubscriptionByUserId(userId: string) {
    const result = await this.db.query(
      `SELECT plan_id as "planId", status, razorpay_subscription_id as "razorpaySubscriptionId", updated_at as "updatedAt"
       FROM subscriptions WHERE user_id = $1`,
      [userId],
    );
    return result.rows[0];
  }

  async getActiveRazorpaySubscriptionIdByUserId(userId: string) {
    const result = await this.db.query(
      'SELECT razorpay_subscription_id FROM subscriptions WHERE user_id = $1 AND status = $2',
      [userId, 'active'],
    );
    return result.rows[0]?.razorpay_subscription_id;
  }
}
