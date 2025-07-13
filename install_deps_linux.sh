#!/usr/bin/env bash
set -euo pipefail
# Install Node.js 18, npm and jq, then fetch project dependencies
sudo apt-get update
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs jq
npm install express pg
