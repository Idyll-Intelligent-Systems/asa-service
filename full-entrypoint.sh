#!/bin/bash
set -e
# ensure nginx proxies to localhost
sed -i 's@http://app:4000@http://localhost:4000@g' /etc/nginx/nginx.conf
# start PostgreSQL service
service postgresql start
# wait for postgres to accept connections
until pg_isready -U postgres >/dev/null 2>&1; do
  echo "Waiting for PostgreSQL..."
  sleep 1
done
# setup database and user password
runuser -u postgres -- psql -c "ALTER USER postgres PASSWORD 'postgres'" || true
runuser -u postgres -- psql -tc "SELECT 1 FROM pg_database WHERE datname='asa_maps'" | grep -q 1 || runuser -u postgres -- psql -c 'CREATE DATABASE asa_maps'
# start node backend
node /app/backend.js &
# start nginx in foreground
nginx -g 'daemon off;'
