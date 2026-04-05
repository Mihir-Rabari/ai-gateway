import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createLogger, Errors, generateId } from '@ai-gateway/utils';
import { KAFKA_TOPICS } from '@ai-gateway/config';
import type { Message, RoutingEvent, ProviderName } from '@ai-gateway/types';
import type Redis from 'ioredis';

const logger = createLogger('routing-service');

interface RouteResult {
  output: string;
  tokensInput: number;
  tokensOutput: number;
  tokensTotal: number;
  model: string;
  provider: ProviderName;
}

interface OpenAiClientLike {
  chat: {
    completions: {
      create: (...args: any[]) => Promise<any>;
    };
  };
}

interface AnthropicClientLike {
  messages: {
    create: (...args: any[]) => Promise<any>;
  };
}

interface GoogleClientLike {
  getGenerativeModel: (...args: any[]) => {
    generateContent: (...innerArgs: any[]) => Promise<any>;
    generateContentStream: (...innerArgs: any[]) => Promise<any>;
  };
}

interface RoutingServiceDeps {
  openaiClient?: OpenAiClientLike;
  anthropicClient?: AnthropicClientLike;
  googleClient?: GoogleClientLike;
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
  private readonly openai: OpenAiClientLike;
  private readonly anthropic: AnthropicClientLike;
  private readonly genAI: GoogleClientLike;
  private readonly FAILURE_THRESHOLD = 5;

  constructor(
    private readonly kafkaPublish: (topic: string, msg: object) => Promise<void>,
    private readonly redis: Redis,
    deps: RoutingServiceDeps = {},
  ) {
    this.openai = deps.openaiClient ?? new OpenAI({ apiKey: process.env['OPENAI_API_KEY'] ?? '' });
    this.anthropic = deps.anthropicClient ?? new Anthropic({ apiKey: process.env['ANTHROPIC_API_KEY'] ?? '' });
    this.genAI = deps.googleClient ?? new GoogleGenerativeAI(process.env['GOOGLE_AI_API_KEY'] ?? '');
  }

  async route(data: {
    requestId: string;
    model: string;
    messages: Message[];
    maxTokens?: number;
    temperature?: number;
    stream?: boolean;
  }): Promise<RouteResult | AsyncIterable<string>> {
    const provider = MODEL_PROVIDER[data.model];
    if (!provider) throw Errors.ROUTING_FAILED();

    const isPrimaryHealthy = await this.isHealthy(provider);

    if (isPrimaryHealthy) {
      try {
        const startedAt = Date.now();
        const result = await this.callProvider(provider, data.model, data.messages, data.maxTokens, data.temperature, data.stream);
        const latencyMs = Date.now() - startedAt;
        void this.publishRoutingEvent('routing.selected', data.requestId, data.model, provider, undefined, latencyMs);
        await this.recordSuccess(provider);
        return result;
      } catch (err) {
        logger.warn({ model: data.model, err }, 'Primary provider failed, trying fallback');
        await this.recordFailure(provider);
      }
    } else {
      logger.warn({ model: data.model, provider }, 'Primary provider unhealthy, skipping to fallback');
    }

    const fallbackModel = FALLBACK_MAP[data.model];
    if (fallbackModel === undefined) throw Errors.ROUTING_FAILED();

    const fallbackProvider = MODEL_PROVIDER[fallbackModel];
    if (fallbackProvider === undefined) throw Errors.ROUTING_FAILED();

    try {
      const startedAt = Date.now();
      const result = await this.callProvider(fallbackProvider, fallbackModel, data.messages, data.maxTokens, data.temperature, data.stream);
      const latencyMs = Date.now() - startedAt;
      void this.publishRoutingEvent(
        'routing.fallback',
        data.requestId,
        fallbackModel,
        fallbackProvider,
        `Primary ${data.model} failed or unhealthy`,
        latencyMs,
      );
      await this.recordSuccess(fallbackProvider);
      return result;
    } catch (fallbackErr) {
      await this.recordFailure(fallbackProvider);
      throw Errors.ROUTING_FAILED();
    }
  }

  private async isHealthy(provider: ProviderName): Promise<boolean> {
    const result = await this.redis.get(`provider:unhealthy:${provider}`);
    return result === null;
  }

  private async markUnhealthy(provider: ProviderName): Promise<void> {
    await this.redis.setex(`provider:unhealthy:${provider}`, 60, '1');
  }

  private async recordFailure(provider: ProviderName): Promise<void> {
    const key = `provider:failures:${provider}`;
    const failures = await this.redis.incr(key);
    await this.redis.expire(key, 300); // reset after 5 minutes
    if (failures >= this.FAILURE_THRESHOLD) {
      await this.markUnhealthy(provider);
      logger.warn({ provider, failures }, 'Provider circuit breaker tripped');
    }
  }

  private async recordSuccess(provider: ProviderName): Promise<void> {
    await this.redis.del(`provider:failures:${provider}`);
  }

  async getProvidersHealth() {
    return Promise.all(['openai', 'anthropic', 'google'].map(async (p) => ({
      name: p,
      models: Object.keys(MODEL_PROVIDER).filter((model) => MODEL_PROVIDER[model] === p),
      healthy: await this.isHealthy(p as ProviderName),
      failureCount: Number(await this.redis.get(`provider:failures:${p}`) ?? '0'),
    })));
  }

  private callProvider(
    provider: ProviderName,
    model: string,
    messages: Message[],
    maxTokens = 1024,
    temperature = 0.7,
    stream = false,
  ): Promise<RouteResult | AsyncIterable<string>> {
    switch (provider) {
      case 'openai':
        return this.callOpenAI(model, messages, maxTokens, temperature, stream);
      case 'anthropic':
        return this.callAnthropic(model, messages, maxTokens, temperature, stream);
      case 'google':
        return this.callGemini(model, messages, maxTokens, temperature, stream);
      default:
        throw Errors.ROUTING_FAILED();
    }
  }

  private async callGemini(
    model: string,
    messages: Message[],
    maxTokens: number,
    temperature: number,
    stream: boolean,
  ): Promise<RouteResult | AsyncIterable<string>> {
    const geminiModel = this.genAI.getGenerativeModel({ model });

    const contents = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const systemInstruction = messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
      .join('\n');

    if (stream) {
      const resultStream = await geminiModel.generateContentStream({
        contents,
        ...(systemInstruction ? { systemInstruction } : {}),
        generationConfig: { maxOutputTokens: maxTokens, temperature },
      });

      return (async function* () {
        for await (const chunk of resultStream.stream) {
          const chunkText = chunk.text();
          if (chunkText) {
            yield `data: ${JSON.stringify({ output: chunkText })}\n\n`;
          }
        }
        yield `data: [DONE]\n\n`;
      })();
    }

    const response = await geminiModel.generateContent({
      contents,
      ...(systemInstruction ? { systemInstruction } : {}),
      generationConfig: { maxOutputTokens: maxTokens, temperature },
    });

    const text = response.response.text();
    const usage = response.response.usageMetadata;

    return {
      output: text,
      tokensInput: usage?.promptTokenCount ?? 0,
      tokensOutput: usage?.candidatesTokenCount ?? 0,
      tokensTotal: usage?.totalTokenCount ?? 0,
      model,
      provider: 'google',
    };
  }

  private async callOpenAI(
    model: string,
    messages: Message[],
    maxTokens: number,
    temperature: number,
    stream: boolean,
  ): Promise<RouteResult | AsyncIterable<string>> {
    if (stream) {
      const responseStream = await this.openai.chat.completions.create({
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
        stream: true,
      });

      return (async function* () {
        for await (const chunk of responseStream) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            yield `data: ${JSON.stringify({ output: content })}\n\n`;
          }
        }
        // Ideally we'd send final usage tokens here, but OpenAI stream usage requires extra config
        yield `data: [DONE]\n\n`;
      })();
    }

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
    stream: boolean,
  ): Promise<RouteResult | AsyncIterable<string>> {
    const systemMessages = messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
      .join('\n');

    const conversationMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    if (stream) {
      const responseStream = await this.anthropic.messages.create({
        model,
        max_tokens: maxTokens,
        temperature,
        ...(systemMessages ? { system: systemMessages } : {}),
        messages: conversationMessages,
        stream: true,
      });

      return (async function* () {
        for await (const chunk of responseStream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            yield `data: ${JSON.stringify({ output: chunk.delta.text })}\n\n`;
          }
        }
        yield `data: [DONE]\n\n`;
      })();
    }

    const response = await this.anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      ...(systemMessages ? { system: systemMessages } : {}),
      messages: conversationMessages,
    });

    const textBlock = response.content.find((b: { type: string }) => b.type === 'text');
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
    latencyMs?: number,
  ): Promise<void> {
    const event: RoutingEvent = {
      eventId: generateId(),
      topic: 'routing.events',
      type,
      requestId,
      model,
      provider,
      latencyMs,
      reason,
      timestamp: new Date().toISOString(),
      version: '1.0',
    };
    return this.kafkaPublish(KAFKA_TOPICS.ROUTING, event);
  }
}
