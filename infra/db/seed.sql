-- Test user: test@example.com / password123
INSERT INTO users (id, email, name, password_hash, plan_id, credit_balance)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'test@example.com',
  'Test User',
  '$2b$12$Z0w1XmZ6r8eH11qV1G2e6Ob/U4j3sS9c7L9b1Z4qW5hZ6Z7U8z1S2', -- dummy bcrypt hash
  'pro',
  1000
) ON CONFLICT DO NOTHING;
