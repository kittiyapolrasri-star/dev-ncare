@echo off
echo ========================================
echo   PharmaCare ERP - Quick Start
echo   Ports: DB=5433 Redis=6380 API=4100 Web=3100
echo ========================================
echo.

REM Check Docker
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not installed or not running!
    echo Please install Docker Desktop first.
    pause
    exit /b 1
)

echo [1/4] Starting PostgreSQL and Redis...
docker-compose up -d postgres redis

echo.
echo [2/4] Waiting for database to be ready...
timeout /t 10 /nobreak >nul

echo.
echo [3/4] Running database migrations and seeding...
cd apps\api
call npx prisma db push
call npx tsx prisma/seed.ts
cd ..\..

echo.
echo [4/4] Starting development servers...
start cmd /k "cd apps\api && npm run dev"
timeout /t 3 /nobreak >nul
start cmd /k "cd apps\web && npm run dev"

echo.
echo ========================================
echo   PharmaCare ERP Started!
echo ========================================
echo.
echo   Frontend:  http://localhost:3100
echo   Backend:   http://localhost:4100
echo   Database:  localhost:5433
echo.
echo   Login:
echo   Email:    ceo@pharmacare.co.th
echo   Password: password123
echo.
echo ========================================
pause
