#!/bin/bash
sed -i 's/store, : .set(key, String(next)),/store.set(key, String(next));/' apps/gateway/src/__tests__/GatewayService.test.ts
sed -i 's/\/\/ eval: async (script/eval: async (script/' apps/gateway/src/__tests__/GatewayService.test.ts
