#!/bin/bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

: "${DOCKER_USERNAME:?DOCKER_USERNAME must be set}"
: "${DOCKER_PASSKEY:?DOCKER_PASSKEY must be set}"

IMAGE="idyll03/app"

echo "Building Docker image..."
docker build -t "$IMAGE:latest" .

echo "Logging in to Docker Hub..."
echo "$DOCKER_PASSKEY" | docker login -u "$DOCKER_USERNAME" --password-stdin

echo "Pushing image to Docker Hub..."
docker push "$IMAGE:latest"
