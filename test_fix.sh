#!/bin/bash
sed -i 's/config\.ALLOWED_ORIGINS\.split/config.ALLOWED_ORIGINS!.split/' apps/billing-service/src/index.ts
sed -i 's/config\.ALLOWED_ORIGINS\.split/config.ALLOWED_ORIGINS!.split/' apps/credit-service/src/index.ts
sed -i 's/config\.ALLOWED_ORIGINS\.split/config.ALLOWED_ORIGINS!.split/' apps/routing-service/src/index.ts
