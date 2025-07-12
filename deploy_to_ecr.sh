#!/bin/bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

if ! command -v aws >/dev/null 2>&1; then
  echo "AWS CLI not found. Please install and configure it." >&2
  exit 1
fi

REGION="eu-north-1"
ECR_REPO="879584802968.dkr.ecr.${REGION}.amazonaws.com/asa-dev"
CLUSTER="asa-dev-cluster"
SERVICE="asa-dev"

echo "Obtaining ECR login token..."
aws ecr get-login-password --region "$REGION" | \
  docker login --username AWS --password-stdin "${ECR_REPO%/*}"

echo "Building Docker image..."
docker build -t asa-dev:latest -f Dockerfile.full .

echo "Tagging image for ECR..."
docker tag asa-dev:latest "$ECR_REPO:latest"

echo "Pushing image to ECR..."
docker push "$ECR_REPO:latest"

echo "Forcing new ECS deployment..."
aws ecs update-service --cluster "$CLUSTER" --service "$SERVICE" --force-new-deployment
