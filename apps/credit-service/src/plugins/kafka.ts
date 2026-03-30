import fp from 'fastify-plugin';
import { Kafka, type Producer } from 'kafkajs';
import type { FastifyInstance } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    kafka: {
      producer: Producer;
      publish: (topic: string, message: object) => Promise<void>;
    };
  }
}

export const kafkaPlugin = fp(async (fastify: FastifyInstance) => {
  const kafka = new Kafka({
    clientId: process.env['KAFKA_CLIENT_ID'] ?? 'credit-service',
    brokers: (process.env['KAFKA_BROKERS'] ?? 'localhost:9092').split(','),
  });
  const producer = kafka.producer();
  await producer.connect();

  const publish = async (topic: string, message: object): Promise<void> => {
    await producer.send({ topic, messages: [{ value: JSON.stringify(message) }] });
  };

  fastify.decorate('kafka', { producer, publish });
  fastify.addHook('onClose', async () => { await producer.disconnect(); });
  fastify.log.info('✅ Kafka producer connected');
});
