import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { createLogger, Errors, generateId } from '@ai-gateway/utils';
import { KAFKA_TOPICS } from '@ai-gateway/config';
import type { Message, RoutingEvent, ProviderName } from '@ai-gateway/types';

const logger = createLogger('routing-service');

interface RouteResult {
  output: string;
  tokensInput: number;
  tokensOutput: number;
  tokensTotal: number;
  model: string;
  provider: ProviderName;
}

// Fallback chain per model
const FALLBACK_MAP: Record<string, string> = {
  'gpt-4o': 'gpt-3.5-turbo',
  'gpt-4-turbo': 'gpt-3.5-turbo',
  'claude-3-5-sonnet-20241022': 'claude-3-haiku-20240307',
  'gemini-1.5-pro': 'gemini-1.5-flash',
};

const MODEL_PROVIDER: Record<string, ProviderName> = {
  'gpt-4o': 'openai',
  'gpt-4-turbo': 'openai',
  'gpt-3.5-turbo': 'openai',
  'claude-3-5-sonnet-20241022': 'anthropic',
  'claude-3-haiku-20240307': 'anthropic',
  'gemini-1.5-pro': 'google',
  'gemini-1.5-flash': 'google',
};

export class RoutingService {
  private readonly openai: OpenAI;
  private readonly anthropic: Anthropic;

  constructor(
    private readonly kafkaPublish: (topic: string, msg: object) => Promise<void>,
  ) {
    this.openai = new OpenAI({ apiKey: process.env['OPENAI_API_KEY'] ?? '' });
    this.anthropic = new Anthropic({ apiKey: process.env['ANTHROPIC_API_KEY'] ?? '' });
  }

  async route(data: {
    requestId: string;
    model: string;
    messages: Message[];
    maxTokens?: number;
    temperature?: number;
  }): Promise<RouteResult> {
    const provider = MODEL_PROVIDER[data.model];
    if (!provider) throw Errors.ROUTING_FAILED();

    try {
      const result = await this.callProvider(provider, data.model, data.messages, data.maxTokens, data.temperature);
      void this.publishRoutingEvent('routing.selected', data.requestId, data.model, provider);
      return result;
    } catch (err) {
      logger.warn({ model: data.model, err }, 'Primary provider failed, trying fallback');

      const fallbackModel = FALLBACK_MAP[data.model];
      if (fallbackModel === undefined) throw Errors.ROUTING_FAILED();

      const fallbackProvider = MODEL_PROVIDER[fallbackModel];
      if (fallbackProvider === undefined) throw Errors.ROUTING_FAILED();

      void this.publishRoutingEvent('routing.fallback', data.requestId, fallbackModel, fallbackProvider, `Primary ${data.model} failed`);
      return this.callProvider(fallbackProvider, fallbackModel, data.messages, data.maxTokens, data.temperature);
    }
  }

  private callProvider(
    provider: ProviderName,
    model: string,
    messages: Message[],
    maxTokens = 1024,
    temperature = 0.7,
  ): Promise<RouteResult> {
    switch (provider) {
      case 'openai':
        return this.callOpenAI(model, messages, maxTokens, temperature);
      case 'anthropic':
        return this.callAnthropic(model, messages, maxTokens, temperature);
      default:
        throw Errors.ROUTING_FAILED();
    }
  }

  private async callOpenAI(
    model: string,
    messages: Message[],
    maxTokens: number,
    temperature: number,
  ): Promise<RouteResult> {
    const response = await this.openai.chat.completions.create({
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
    });

    const choice = response.choices[0];
    if (!choice?.message.content) throw Errors.PROVIDER_ERROR('Empty response from OpenAI');

    return {
      output: choice.message.content,
      tokensInput: response.usage?.prompt_tokens ?? 0,
      tokensOutput: response.usage?.completion_tokens ?? 0,
      tokensTotal: response.usage?.total_tokens ?? 0,
      model,
      provider: 'openai',
    };
  }

  private async callAnthropic(
    model: string,
    messages: Message[],
    maxTokens: number,
    temperature: number,
  ): Promise<RouteResult> {
    const systemMessages = messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
      .join('\n');

    const conversationMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const response = await this.anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      ...(systemMessages ? { system: systemMessages } : {}),
      messages: conversationMessages,
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') throw Errors.PROVIDER_ERROR('Empty response from Anthropic');

    return {
      output: textBlock.text,
      tokensInput: response.usage.input_tokens,
      tokensOutput: response.usage.output_tokens,
      tokensTotal: response.usage.input_tokens + response.usage.output_tokens,
      model,
      provider: 'anthropic',
    };
  }

  private publishRoutingEvent(
    type: RoutingEvent['type'],
    requestId: string,
    model: string,
    provider: ProviderName,
    reason?: string,
  ): Promise<void> {
    const event: RoutingEvent = {
      eventId: generateId(),
      topic: 'routing.events',
      type,
      requestId,
      model,
      provider,
      reason,
      timestamp: new Date().toISOString(),
      version: '1.0',
    };
    return this.kafkaPublish(KAFKA_TOPICS.ROUTING, event);
  }
}
