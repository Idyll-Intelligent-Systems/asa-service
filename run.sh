#!/bin/bash

# Simple helper to start the Node backend with a local Dockerized PostgreSQL
set -e

# name for the database container
DB_CONTAINER="asa-maps-db"

# start postgres if it's not already running
if ! docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
  echo "Launching PostgreSQL container..."
  docker run -d --rm \
    --name ${DB_CONTAINER} \
    -e POSTGRES_DB=asa_maps \
    -e POSTGRES_USER=postgres \
    -e POSTGRES_PASSWORD=postgres \
    -p 5432:5432 \
    postgres:15
  # wait for postgres to become ready
  until docker exec ${DB_CONTAINER} pg_isready -U postgres >/dev/null 2>&1; do
    echo "Waiting for PostgreSQL..."
    sleep 2
  done
fi

# run the backend with the static frontend
node backend.js
