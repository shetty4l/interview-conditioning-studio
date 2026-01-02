#!/usr/bin/env bash
set -euo pipefail

# Resolve paths relative to script location
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
TOOLS_DIR="$PROJECT_DIR/tools"
BUN_DIR="$TOOLS_DIR/bun"
VERSION_FILE="$PROJECT_DIR/.bun-version"

# Read version from .bun-version file
if [[ ! -f "$VERSION_FILE" ]]; then
    echo "Error: $VERSION_FILE not found"
    exit 1
fi
BUN_VERSION="$(cat "$VERSION_FILE" | tr -d '[:space:]')"

# Detect platform
OS="$(uname -s)"
ARCH="$(uname -m)"

case "$OS-$ARCH" in
    Linux-x86_64)  PLATFORM="linux-x64" ;;
    Linux-aarch64) PLATFORM="linux-aarch64" ;;
    Darwin-x86_64) PLATFORM="darwin-x64" ;;
    Darwin-arm64)  PLATFORM="darwin-aarch64" ;;
    *)
        echo "Error: Unsupported platform: $OS-$ARCH"
        echo "Supported: Linux (x86_64, aarch64), macOS (x86_64, arm64)"
        exit 1
        ;;
esac

BUN_ARCHIVE="bun-$PLATFORM.zip"
BUN_URL="https://github.com/oven-sh/bun/releases/download/bun-v$BUN_VERSION/$BUN_ARCHIVE"

# Check if already installed with correct version
if [[ -x "$BUN_DIR/bun" ]]; then
    INSTALLED_VERSION="$("$BUN_DIR/bun" --version 2>/dev/null || echo "unknown")"
    if [[ "$INSTALLED_VERSION" == "$BUN_VERSION" ]]; then
        echo "Bun $BUN_VERSION already installed at $BUN_DIR"
        echo ""
        echo "To activate the environment, run:"
        echo "  source scripts/activate"
        exit 0
    else
        echo "Bun version mismatch: installed=$INSTALLED_VERSION, required=$BUN_VERSION"
        echo "Removing old installation..."
        rm -rf "$BUN_DIR"
    fi
fi

echo "Installing Bun $BUN_VERSION for $PLATFORM..."
echo ""

# Create tools directory
mkdir -p "$TOOLS_DIR"

# Download
echo "Downloading $BUN_URL..."
if command -v curl &> /dev/null; then
    curl -L --progress-bar -o "$TOOLS_DIR/$BUN_ARCHIVE" "$BUN_URL"
elif command -v wget &> /dev/null; then
    wget -q --show-progress -O "$TOOLS_DIR/$BUN_ARCHIVE" "$BUN_URL"
else
    echo "Error: Neither curl nor wget found. Please install one of them."
    exit 1
fi

# Extract
echo "Extracting..."
unzip -q "$TOOLS_DIR/$BUN_ARCHIVE" -d "$TOOLS_DIR"
rm "$TOOLS_DIR/$BUN_ARCHIVE"

# Rename to standard path (bun releases extract to bun-PLATFORM/)
mv "$TOOLS_DIR/bun-$PLATFORM" "$BUN_DIR"

# Generate activate script with venv-style activation/deactivation
cat > "$SCRIPT_DIR/activate" << 'ACTIVATE_EOF'
# Source this file to activate the IDS development environment
# Usage: source scripts/activate
# To deactivate: deactivate

# Guard against double activation
if [[ -n "${IDS_ACTIVE:-}" ]]; then
    echo "IDS environment is already active."
    echo "Run 'deactivate' first if you want to re-activate."
    return 0
fi

# Resolve paths relative to script location
_IDS_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
_IDS_PROJECT_DIR="$(dirname "$_IDS_SCRIPT_DIR")"
_IDS_BUN_DIR="$_IDS_PROJECT_DIR/tools/bun"

# Verify Bun is installed
if [[ ! -x "$_IDS_BUN_DIR/bun" ]]; then
    echo "Error: Bun not found at $_IDS_BUN_DIR"
    echo "Run ./scripts/bootstrap.sh first."
    unset _IDS_SCRIPT_DIR _IDS_PROJECT_DIR _IDS_BUN_DIR
    return 1
fi

# Save original environment for deactivate
_IDS_OLD_PATH="$PATH"

# Set up environment
export PATH="$_IDS_BUN_DIR:$PATH"

# Mark as active (exported so Starship/prompt tools can detect it)
export IDS_ACTIVE=1

# Define deactivate function
deactivate() {
    # Restore PATH
    if [[ -n "${_IDS_OLD_PATH:-}" ]]; then
        export PATH="$_IDS_OLD_PATH"
    fi

    # Unset active marker
    unset IDS_ACTIVE

    # Clean up tracking variables
    unset _IDS_OLD_PATH
    unset _IDS_SCRIPT_DIR
    unset _IDS_PROJECT_DIR
    unset _IDS_BUN_DIR

    # Remove the deactivate function itself
    unset -f deactivate

    echo "IDS environment deactivated."
}

# Print confirmation
echo "IDS environment activated."
echo "  bun: $(which bun)"
echo "  version: $(bun --version)"
echo ""
echo "Run 'deactivate' to restore original environment."
ACTIVATE_EOF

echo ""
echo "Bun $BUN_VERSION installed successfully!"
echo ""

# Run bun install to get dependencies
echo "Installing dependencies..."
cd "$PROJECT_DIR"
"$BUN_DIR/bun" install

echo ""
echo "To activate the environment, run:"
echo "  source scripts/activate"
echo ""
echo "To deactivate later:"
echo "  deactivate"
