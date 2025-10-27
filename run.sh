#!/bin/bash

# run.sh - Run both backend and frontend for local development
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to cleanup background processes on exit
cleanup() {
    echo -e "\n${RED}Shutting down...${NC}"
    kill 0
    exit
}

trap cleanup SIGINT SIGTERM

echo -e "${BLUE}Starting Service Template in Development Mode${NC}\n"

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found${NC}"
    echo "Please copy .env.example to .env and configure it"
    exit 1
fi

# Start backend
echo -e "${GREEN}Starting backend on http://localhost:5656${NC}"
cd backend
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 5656 2>&1 | sed "s/^/[BACKEND] /" &
BACKEND_PID=$!
cd ..

# Wait a bit for backend to start
sleep 2

# Start frontend
echo -e "${GREEN}Starting frontend on http://localhost:3000${NC}"
cd frontend
npm run dev 2>&1 | sed "s/^/[FRONTEND] /" &
FRONTEND_PID=$!
cd ..

echo -e "\n${BLUE}======================================${NC}"
echo -e "${GREEN}Development servers running:${NC}"
echo -e "  Frontend: ${BLUE}http://localhost:3000${NC}"
echo -e "  Backend:  ${BLUE}http://localhost:5656${NC}"
echo -e "  API Docs: ${BLUE}http://localhost:5656/docs${NC}"
echo -e "${BLUE}======================================${NC}"
echo -e "\nPress ${RED}Ctrl+C${NC} to stop both servers\n"

# Wait for both processes
wait
