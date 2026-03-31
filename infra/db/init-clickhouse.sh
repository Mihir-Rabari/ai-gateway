#!/bin/bash
# Wait for ClickHouse to be healthy, then apply schema
until curl -sf "http://localhost:8123/ping"; do sleep 2; done
curl -X POST "http://localhost:8123/" --data-binary @/infra/db/clickhouse-schema.sql
