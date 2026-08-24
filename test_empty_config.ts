import { RoutingService } from './apps/routing-service/src/services/routingService.ts';

const service = new RoutingService(
  async () => undefined,
  {
    mget: async () => []
  } as any,
  {} as any
);

console.log('modelConfig:', service.modelConfig);
