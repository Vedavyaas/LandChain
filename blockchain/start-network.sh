#!/usr/bin/env bash
# LandChain Hyperledger Fabric Docker Network Launcher
set -euo pipefail

echo "=========================================================="
echo " Starting Hyperledger Fabric Network for LandChain...    "
echo "=========================================================="

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd "$DIR"

if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed or not in PATH."
    exit 1
fi

docker compose -f docker-compose.yaml down -v --remove-orphans || true
docker compose -f docker-compose.yaml up -d

echo "=========================================================="
echo " ✓ LandChain Fabric Network running on Docker!           "
echo "   Orderer: localhost:7050                               "
echo "   Peer0:   localhost:7051 (gRPC / Gateway)              "
echo "   Channel: landchannel                                  "
echo "=========================================================="
