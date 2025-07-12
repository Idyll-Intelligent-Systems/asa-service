#!/bin/sh
set -e
# wait for database
if [ -n "$PGHOST" ]; then
  until pg_isready -h "$PGHOST" -p "$PGPORT" -U "$PGUSER"; do
    echo "Waiting for database..."
    sleep 2
  done
fi
node backend.js
