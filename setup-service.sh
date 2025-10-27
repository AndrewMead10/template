#!/bin/bash

# Service Setup Script
# This script sets up a systemd service for the Docker Compose application
# Usage: ./setup-service.sh [SERVICE_NAME]
# If SERVICE_NAME is not provided, defaults to "template-service"

set -e

# Configuration
SERVICE_NAME="${1:-template-service}"  # Use first argument or default to "template-service"
SERVICE_PORT="5656"                     # Port the service runs on

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "Setting up ${SERVICE_NAME} as a systemd service..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Error: This script must be run as root (use sudo)${NC}"
    exit 1
fi

# Check if running in the correct directory
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}Error: docker-compose.yml not found in current directory${NC}"
    echo "Please run this script from the project root directory"
    exit 1
fi

# Get the absolute path to the project directory
PROJECT_DIR=$(pwd)

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    echo "Please install Docker first: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}Error: Docker Compose is not installed${NC}"
    echo "Please install Docker Compose first: https://docs.docker.com/compose/install/"
    exit 1
fi

# Determine which docker compose command to use
if docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
else
    COMPOSE_CMD="docker-compose"
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Warning: .env file not found${NC}"
    echo "Creating .env from .env.example..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${YELLOW}Please edit .env file with your configuration before starting the service${NC}"
    else
        echo -e "${RED}Error: .env.example not found${NC}"
        exit 1
    fi
fi

# Create data directory if it doesn't exist
mkdir -p "${PROJECT_DIR}/data"
chmod 755 "${PROJECT_DIR}/data"

# Create systemd service file
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

echo "Creating systemd service file at ${SERVICE_FILE}..."

cat > "${SERVICE_FILE}" << EOF
[Unit]
Description=${SERVICE_NAME} Service
Requires=docker.service
After=docker.service network-online.target
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=${PROJECT_DIR}
ExecStart=${COMPOSE_CMD} up -d
ExecStop=${COMPOSE_CMD} down
ExecReload=${COMPOSE_CMD} restart
TimeoutStartSec=300
TimeoutStopSec=60

# Restart policy
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

echo -e "${GREEN}✓ Systemd service file created${NC}"

# Reload systemd to recognize the new service
echo "Reloading systemd daemon..."
systemctl daemon-reload

# Enable the service to start on boot
echo "Enabling ${SERVICE_NAME} service to start on boot..."
systemctl enable "${SERVICE_NAME}"

echo -e "${GREEN}✓ Service enabled${NC}"

# Build the Docker image
echo "Building Docker image..."
cd "${PROJECT_DIR}"
${COMPOSE_CMD} build

echo -e "${GREEN}✓ Docker image built${NC}"

# Start the service
echo "Starting ${SERVICE_NAME} service..."
systemctl start "${SERVICE_NAME}"

# Wait a moment for the service to start
sleep 3

# Check service status
if systemctl is-active --quiet "${SERVICE_NAME}"; then
    echo -e "${GREEN}✓ Service is running!${NC}"

    # Check if the API is responding
    echo "Checking if API is responding..."
    sleep 2
    if curl -s -f http://localhost:${SERVICE_PORT}/ > /dev/null 2>&1; then
        echo -e "${GREEN}✓ API is responding at http://localhost:${SERVICE_PORT}${NC}"
    else
        echo -e "${YELLOW}⚠️  Service is running but API may not be ready yet${NC}"
        echo "You can check the logs with: sudo journalctl -u ${SERVICE_NAME} -f"
    fi
else
    echo -e "${RED}✗ Service failed to start${NC}"
    echo "Check service logs with: sudo systemctl status ${SERVICE_NAME}"
    exit 1
fi

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Setup complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo ""
echo "Service management commands:"
echo "  Start:   sudo systemctl start ${SERVICE_NAME}"
echo "  Stop:    sudo systemctl stop ${SERVICE_NAME}"
echo "  Restart: sudo systemctl restart ${SERVICE_NAME}"
echo "  Status:  sudo systemctl status ${SERVICE_NAME}"
echo "  Logs:    sudo journalctl -u ${SERVICE_NAME} -f"
echo ""
echo "Docker commands:"
echo "  Logs:    ${COMPOSE_CMD} logs -f"
echo "  Shell:   ${COMPOSE_CMD} exec backend bash"
echo ""
echo "Update deployment:"
echo "  ./update-deployment.sh"
echo ""
