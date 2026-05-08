#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="$(tr -d '[:space:]' < "$ROOT/VERSION")"
INSTALL_DIR="${SISO_AGENT_BASE_DIR:-$HOME/.siso-agent-base}"
PROFILE_DIR="${SISO_PROFILE_DIR:-$HOME/.siso/agent/profile}"
SECRETS_FILE="${SISO_SECRETS_FILE:-$HOME/.siso/agent/secrets.env}"
BIN_DIR="${SISO_BIN_DIR:-$HOME/bin}"
GATEWAY_BASE="${SISO_GATEWAY_BASE:-https://shaans-mac-mini.tail100d11.ts.net:8443}"
ANTHROPIC_BASE="$GATEWAY_BASE/anthropic"
OPENAI_BASE="$GATEWAY_BASE/openai/v1"

info() { printf '%s\n' "$*"; }
fail() { printf 'siso install: %s\n' "$*" >&2; exit 1; }

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "missing required command: $1"
}

need_cmd git
need_cmd curl
need_cmd node

if [[ -f "$ROOT/package.json" ]]; then
  if [[ ! -d "$ROOT/node_modules/@mariozechner/pi-tui" || ! -d "$ROOT/node_modules/@mariozechner/pi-coding-agent" ]]; then
    info "Installing SISO Agent Base runtime dependencies..."
    npm --prefix "$ROOT" install --omit=dev --no-audit --no-fund
  fi
fi

mkdir -p "$PROFILE_DIR" "$(dirname "$SECRETS_FILE")" "$BIN_DIR"

if [[ ! -f "$SECRETS_FILE" ]] || ! grep -q '^SISO_BIFROST_KEY=' "$SECRETS_FILE"; then
  if [[ -n "${SISO_BIFROST_KEY:-}" ]]; then
    key="$SISO_BIFROST_KEY"
  else
    printf 'Paste your SISO Bifrost key: ' >&2
    IFS= read -r key
  fi
  [[ "$key" == sk-bf-* ]] || fail "key should start with sk-bf-"
  umask 077
  {
    printf 'SISO_BIFROST_KEY=%q\n' "$key"
    printf 'SISO_GATEWAY_BASE=%q\n' "$GATEWAY_BASE"
  } > "$SECRETS_FILE"
  chmod 600 "$SECRETS_FILE"
fi

# shellcheck disable=SC1090
source "$SECRETS_FILE"
[[ -n "${SISO_BIFROST_KEY:-}" ]] || fail "SISO_BIFROST_KEY missing in $SECRETS_FILE"

tmp_models="$(mktemp)"
sed \
  -e "s#__SISO_ANTHROPIC_BASE__#$ANTHROPIC_BASE#g" \
  -e "s#__SISO_BIFROST_KEY__#$SISO_BIFROST_KEY#g" \
  "$ROOT/templates/profile/models.json.template" > "$tmp_models"
mv "$tmp_models" "$PROFILE_DIR/models.json"
chmod 600 "$PROFILE_DIR/models.json"

cp "$ROOT/templates/profile/settings.json" "$PROFILE_DIR/settings.json"
cp "$ROOT/templates/profile/SYSTEM.md" "$PROFILE_DIR/SYSTEM.md"

for name in siso siso-update siso-doctor; do
  cp "$ROOT/bin/$name" "$BIN_DIR/$name"
  chmod 755 "$BIN_DIR/$name"
done

cat > "$BIN_DIR/siso-version" <<EOF
#!/usr/bin/env bash
set -euo pipefail
printf 'SISO Agent Base %s\n' "$VERSION"
printf 'Install dir: %s\n' "$INSTALL_DIR"
printf 'Profile dir: %s\n' "$PROFILE_DIR"
printf 'Gateway: %s\n' "$GATEWAY_BASE"
EOF
chmod 755 "$BIN_DIR/siso-version"

if [[ ":$PATH:" != *":$BIN_DIR:"* ]]; then
  info "Add this to your shell profile if siso is not found:"
  info "  export PATH=\"\$HOME/bin:\$PATH\""
fi

"$BIN_DIR/siso-doctor"

info ""
info "SISO Agent Base installed."
info "Run: siso"
info "Update: siso update"
info "Health: siso doctor"
