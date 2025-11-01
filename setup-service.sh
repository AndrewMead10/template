#!/bin/bash

# [SERVICE_NAME] Service Setup Script
# This script sets up the systemd service for the application
# Usage: ./setup-service.sh
# REPLACE [SERVICE_NAME] with actual service name

set -e

SERVICE_NAME="your-service"  # REPLACE with actual service name
SERVICE_PORT="5656"          # REPLACE with actual port

echo "Setting up ${SERVICE_NAME} systemd service..."

# Check if running in the correct directory
if [ ! -f "docker-compose.yml" ]; then
    echo "Error: docker-compose.yml not found in current directory"
    echo "Please run this script from the project root directory"
    exit 1
fi

# Create systemd service file
echo "Creating systemd service file..."
sudo tee "/etc/systemd/system/${SERVICE_NAME}.service" > /dev/null <<EOF
[Unit]
Description=${SERVICE_NAME} Service
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$(pwd)
ExecStart=/usr/bin/docker-compose up -d
ExecStop=/usr/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd to recognize the new service
echo "Reloading systemd daemon..."
sudo systemctl daemon-reload

# Enable the service to start on boot
echo "Enabling ${SERVICE_NAME} service..."
sudo systemctl enable "${SERVICE_NAME}"

# Start the service
echo "Starting ${SERVICE_NAME} service..."
sudo systemctl start "${SERVICE_NAME}"

echo "Checking service status..."
if systemctl is-active --quiet "${SERVICE_NAME}"; then
    echo "✅ Service is running successfully!"

    # Check if the API is responding
    if curl -s -f http://192.168.0.119:${SERVICE_PORT}/ > /dev/null; then
        echo "✅ API is responding at http://192.168.0.119:${SERVICE_PORT}"
    else
        echo "⚠️  Service is running but API may not be ready yet"
    fi
else
    echo "❌ Service failed to start"
    echo "Check service logs with: sudo systemctl status ${SERVICE_NAME}"
    exit 1
fi

echo ""
echo "Setup complete!"
echo "Service logs: sudo journalctl -u ${SERVICE_NAME} -f"
echo "Docker logs: docker-compose logs -f"
echo ""
echo "To update the service later, run: ./update-deployment.sh"
