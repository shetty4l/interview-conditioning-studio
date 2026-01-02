#!/usr/bin/env bash
set -euo pipefail

# Resolve paths relative to script location
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "Cleaning IDS development environment..."

# Remove tools directory
if [[ -d "$PROJECT_DIR/tools" ]]; then
    echo "Removing tools/..."
    rm -rf "$PROJECT_DIR/tools"
fi

# Remove node_modules
if [[ -d "$PROJECT_DIR/node_modules" ]]; then
    echo "Removing node_modules/..."
    rm -rf "$PROJECT_DIR/node_modules"
fi

# Remove generated activate script
if [[ -f "$SCRIPT_DIR/activate" ]]; then
    echo "Removing scripts/activate..."
    rm -f "$SCRIPT_DIR/activate"
fi

# Remove build output
if [[ -d "$PROJECT_DIR/web/js/lib" ]]; then
    echo "Removing web/js/lib/..."
    rm -rf "$PROJECT_DIR/web/js/lib"
fi

# Remove bun lockfile
if [[ -f "$PROJECT_DIR/bun.lockb" ]]; then
    echo "Removing bun.lockb..."
    rm -f "$PROJECT_DIR/bun.lockb"
fi

echo ""
echo "Clean complete. Run ./scripts/bootstrap.sh to reinstall."
