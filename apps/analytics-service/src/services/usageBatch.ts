import type { UsageEvent } from '@ai-gateway/types';

export interface RequestLogRow {
  request_id: string;
  user_id: string;
  app_id: string;
  model: string;
  provider: string;
  tokens_input: number;
  tokens_output: number;
  tokens_total: number;
  credits_deducted: number;
  latency_ms: number;
  success: number;
  error_code: string | null;
  timestamp: string;
}

export const toRequestLogRow = (event: UsageEvent): RequestLogRow => ({
  request_id: event.requestId,
  user_id: event.userId,
  app_id: event.appId,
  model: event.model,
  provider: event.provider,
  tokens_input: event.tokensInput,
  tokens_output: event.tokensOutput,
  tokens_total: event.tokensTotal,
  credits_deducted: event.creditsDeducted,
  latency_ms: event.latencyMs,
  success: event.type === 'usage.request.completed' ? 1 : 0,
  error_code: event.errorCode ?? null,
  timestamp: event.timestamp,
});

export class UsageBatchBuffer {
  private readonly events: UsageEvent[] = [];

  constructor(private readonly batchSize: number) {}

  push(event: UsageEvent): UsageEvent[] | null {
    this.events.push(event);
    if (this.events.length < this.batchSize) return null;
    return this.drain();
  }

  drain(): UsageEvent[] {
    if (this.events.length === 0) return [];
    return this.events.splice(0, this.events.length);
  }

  size(): number {
    return this.events.length;
  }
}
