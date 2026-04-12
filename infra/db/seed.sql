-- ──────────────────────────────────────────────
-- Providers
-- ──────────────────────────────────────────────
INSERT INTO providers (id, slug, name) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'openai',          'OpenAI'),
  ('b0000000-0000-0000-0000-000000000002', 'anthropic',       'Anthropic'),
  ('b0000000-0000-0000-0000-000000000003', 'google',          'Google Gemini AI Studio'),
  ('b0000000-0000-0000-0000-000000000004', 'azure',           'Microsoft Azure OpenAI'),
  ('b0000000-0000-0000-0000-000000000005', 'gcp_vertex',      'Google Cloud Vertex AI'),
  ('b0000000-0000-0000-0000-000000000006', 'amazon_bedrock',  'Amazon Bedrock'),
  ('b0000000-0000-0000-0000-000000000007', 'cohere',          'Cohere'),
  ('b0000000-0000-0000-0000-000000000008', 'mistral',         'Mistral AI')
ON CONFLICT (slug) DO NOTHING;

-- ──────────────────────────────────────────────
-- Models
-- ──────────────────────────────────────────────
INSERT INTO models (id, slug, name, provider_id) VALUES
  -- OpenAI
  ('c0000000-0000-0000-0000-000000000001', 'gpt-4o',                        'GPT-4o',                          'b0000000-0000-0000-0000-000000000001'),
  ('c0000000-0000-0000-0000-000000000002', 'gpt-4-turbo',                   'GPT-4 Turbo',                     'b0000000-0000-0000-0000-000000000001'),
  ('c0000000-0000-0000-0000-000000000003', 'gpt-3.5-turbo',                 'GPT-3.5 Turbo',                   'b0000000-0000-0000-0000-000000000001'),
  -- Anthropic
  ('c0000000-0000-0000-0000-000000000004', 'claude-3-5-sonnet-20241022',    'Claude 3.5 Sonnet',               'b0000000-0000-0000-0000-000000000002'),
  ('c0000000-0000-0000-0000-000000000005', 'claude-3-haiku-20240307',       'Claude 3 Haiku',                  'b0000000-0000-0000-0000-000000000002'),
  -- Google
  ('c0000000-0000-0000-0000-000000000006', 'gemini-2.5-pro',                'Gemini 2.5 Pro',                  'b0000000-0000-0000-0000-000000000003'),
  ('c0000000-0000-0000-0000-000000000007', 'gemini-2.5-flash',              'Gemini 2.5 Flash',                'b0000000-0000-0000-0000-000000000003')
ON CONFLICT (slug) DO NOTHING;

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
