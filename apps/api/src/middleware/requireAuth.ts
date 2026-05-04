import type { FastifyRequest, FastifyReply } from 'fastify';

// Store validated user on request context
declare module 'fastify' {
  interface FastifyRequest {
    userId: string;
    planId: 'free' | 'pro' | 'max';
    userEmail: string;
  }
}

export async function requireAuth(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({ success: false, error: { code: 'AUTH_001', message: 'Missing token', statusCode: 401 } });
  }

  const token = authHeader.slice(7);
  const authServiceUrl = process.env['AUTH_SERVICE_URL'] ?? 'http://localhost:3003';

  try {
    const res = await fetch(`${authServiceUrl}/internal/auth/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });

    // Treat non-200 from the auth service as an invalid token rather than crashing the API.
    if (!res.ok) {
      return reply.status(401).send({ success: false, error: { code: 'AUTH_002', message: 'Invalid token', statusCode: 401 } });
    }

    const json = (await res.json()) as { success: boolean; data?: { userId: string; planId: string; email: string } };
    if (!json.success || !json.data) {
      return reply.status(401).send({ success: false, error: { code: 'AUTH_002', message: 'Invalid token', statusCode: 401 } });
    }

    req.userId = json.data.userId;
    req.planId = json.data.planId as 'free' | 'pro' | 'max';
    req.userEmail = json.data.email;
  } catch (err) {
    // If the auth service is unreachable, return 401 so frontend can handle re-auth flow.
    return reply.status(401).send({ success: false, error: { code: 'AUTH_003', message: 'Auth service unavailable', statusCode: 401 } });
  }
}
