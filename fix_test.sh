#!/bin/bash
sed -i 's/import { describe, it, expect, vi, beforeEach } from '\''vitest'\'';/import { describe, it, expect, vi, beforeEach, afterEach } from '\''vitest'\'';/g' apps/routing-service/src/__tests__/routing.test.ts
