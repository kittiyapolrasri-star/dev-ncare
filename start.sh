#!/bin/bash
echo "========================================"
echo "  PharmaCare ERP - Quick Start"
echo "  Ports: DB=5433 Redis=6380 API=4100 Web=3100"
echo "========================================"
echo

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "[ERROR] Docker is not installed!"
    exit 1
fi

echo "[1/4] Starting PostgreSQL and Redis..."
docker-compose up -d postgres redis

echo
echo "[2/4] Waiting for database to be ready..."
sleep 10

echo
echo "[3/4] Running database migrations and seeding..."
cd apps/api
npx prisma db push
npx tsx prisma/seed.ts
cd ../..

echo
echo "[4/4] Starting development servers..."
npm run dev &

echo
echo "========================================"
echo "  PharmaCare ERP Started!"
echo "========================================"
echo
echo "  Frontend:  http://localhost:3100"
echo "  Backend:   http://localhost:4100"
echo "  Database:  localhost:5433"
echo
echo "  Login:"
echo "  Email:    ceo@pharmacare.co.th"
echo "  Password: password123"
echo
echo "========================================"
