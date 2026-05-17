#!/usr/bin/env bash
set -euo pipefail

echo "Running mobile-critical offer flow tests..."
npm --prefix mobile run test -- src/lib/notifications/notifications-client.test.ts

echo "Running backend checkout offer token guard tests..."
npm run test -- src/orders/checkout.service.spec.ts

echo "Mobile-critical offer flow checks passed."
