import { RoutingService } from './apps/routing-service/src/services/routingService.ts';

const config = { modelProvider: {}, fallbackMap: {} };
const modelProvider = config?.modelProvider || {};
console.log("modelProvider:", modelProvider);
console.log("Object.values:", Object.values(modelProvider));
console.log("Set:", [...new Set(Object.values(modelProvider))]);
