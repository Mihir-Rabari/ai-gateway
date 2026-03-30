#!/bin/bash
echo "Checking Postgres..."
docker-compose exec postgres pg_isready -U gateway_user

echo "Checking Redis..."
docker-compose exec redis redis-cli ping

echo "Checking Kafka..."
docker-compose exec kafka kafka-broker-api-versions --bootstrap-server localhost:9092

echo "Checking ClickHouse..."
curl -sf http://localhost:8123/ping && echo "OK"
