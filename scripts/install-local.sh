#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="$(tr -d '[:space:]' < "$ROOT/VERSION")"
INSTALL_DIR="${SISO_AGENT_BASE_DIR:-$HOME/.siso-agent-base}"
INSTALL_MARKER=".siso-agent-base-install"
PROFILE_DIR="${SISO_PROFILE_DIR:-$HOME/.siso/agent/profile}"
SECRETS_FILE="${SISO_SECRETS_FILE:-$HOME/.siso/agent/secrets.env}"
BIN_DIR="${SISO_BIN_DIR:-$HOME/bin}"
GATEWAY_BASE="${SISO_GATEWAY_BASE:-https://shaans-mac-mini.tail100d11.ts.net:8443}"
ANTHROPIC_BASE="$GATEWAY_BASE/anthropic"
OPENAI_BASE="$GATEWAY_BASE/openai/v1"

info() { printf '%s\n' "$*"; }
fail() { printf 'siso install: %s\n' "$*" >&2; exit 1; }

dir_has_entries() {
  [[ -d "$1" ]] && find "$1" -mindepth 1 -maxdepth 1 -print -quit | grep -q .
}

validate_install_dir() {
  [[ -n "${INSTALL_DIR:-}" ]] || fail "SISO_AGENT_BASE_DIR must not be empty"
  [[ "$INSTALL_DIR" = /* ]] || fail "SISO_AGENT_BASE_DIR must be an absolute path: $INSTALL_DIR"
  [[ "$INSTALL_DIR" != "/" ]] || fail "refusing to install into /"
  [[ "$INSTALL_DIR" != "$HOME" ]] || fail "refusing to install into HOME: $HOME"
  if [[ -d "$INSTALL_DIR" && ! -e "$INSTALL_DIR/$INSTALL_MARKER" ]] && dir_has_entries "$INSTALL_DIR"; then
    fail "refusing non-empty unmarked install dir: $INSTALL_DIR (expected $INSTALL_MARKER)"
  fi
}

write_install_marker() {
  {
    printf 'SISO_AGENT_BASE_INSTALL=1\n'
    printf 'source=%s\n' "$ROOT"
    printf 'version=%s\n' "$VERSION"
  } > "$INSTALL_DIR/$INSTALL_MARKER"
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "missing required command: $1"
}

need_cmd git
need_cmd curl
need_cmd node
need_cmd rsync

if [[ -f "$ROOT/package.json" ]]; then
  if [[ "${SISO_SKIP_RELEASE_SMOKE:-0}" != "1" ]]; then
    info "Verifying SISO Agent Base release metadata..."
    npm --prefix "$ROOT" run smoke:release >/dev/null
    npm --prefix "$ROOT" run smoke:install-release >/dev/null
  fi
  if [[ ! -d "$ROOT/node_modules/@mariozechner/pi-tui" || ! -d "$ROOT/node_modules/@mariozechner/pi-coding-agent" ]]; then
    info "Installing SISO Agent Base runtime dependencies..."
    npm --prefix "$ROOT" install --omit=dev --no-audit --no-fund
  fi
  info "Applying SISO native Pi renderer polish..."
  SISO_PI_PACKAGE_ROOT="$ROOT/node_modules/@mariozechner/pi-coding-agent/dist" node "$ROOT/scripts/patch-pi-native-renderers.mjs" >/dev/null
  if ! SISO_PI_PACKAGE_ROOT="$ROOT/node_modules/@mariozechner/pi-coding-agent/dist" node "$ROOT/scripts/smoke-pi-native-renderers.mjs" >/dev/null 2>&1; then
    info "Repairing SISO Agent Base runtime dependencies..."
    rm -rf "$ROOT/node_modules"
    npm --prefix "$ROOT" install --omit=dev --no-audit --no-fund
    SISO_PI_PACKAGE_ROOT="$ROOT/node_modules/@mariozechner/pi-coding-agent/dist" node "$ROOT/scripts/patch-pi-native-renderers.mjs" >/dev/null
    SISO_PI_PACKAGE_ROOT="$ROOT/node_modules/@mariozechner/pi-coding-agent/dist" node "$ROOT/scripts/smoke-pi-native-renderers.mjs" >/dev/null
  fi
fi

RUNTIME_ROOT="$ROOT"
if [[ "$ROOT" != "$INSTALL_DIR" ]]; then
  validate_install_dir
  info "Syncing SISO Agent Base runtime to $INSTALL_DIR..."
  mkdir -p "$INSTALL_DIR"
  write_install_marker
  rsync -a \
    --exclude='.git/' \
    --exclude='node_modules/' \
    --exclude='.DS_Store' \
    "$ROOT/" "$INSTALL_DIR/"
  write_install_marker
  RUNTIME_ROOT="$INSTALL_DIR"
  if [[ ! -d "$RUNTIME_ROOT/node_modules/@mariozechner/pi-tui" || ! -d "$RUNTIME_ROOT/node_modules/@mariozechner/pi-coding-agent" ]]; then
    info "Installing SISO Agent Base runtime dependencies in $RUNTIME_ROOT..."
    npm --prefix "$RUNTIME_ROOT" install --omit=dev --no-audit --no-fund
  fi
  info "Applying installed SISO native Pi renderer polish..."
  SISO_PI_PACKAGE_ROOT="$RUNTIME_ROOT/node_modules/@mariozechner/pi-coding-agent/dist" node "$RUNTIME_ROOT/scripts/patch-pi-native-renderers.mjs" >/dev/null
  SISO_PI_PACKAGE_ROOT="$RUNTIME_ROOT/node_modules/@mariozechner/pi-coding-agent/dist" node "$RUNTIME_ROOT/scripts/smoke-pi-native-renderers.mjs" >/dev/null
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
  "$RUNTIME_ROOT/templates/profile/models.json.template" > "$tmp_models"
mv "$tmp_models" "$PROFILE_DIR/models.json"
chmod 600 "$PROFILE_DIR/models.json"

cp "$RUNTIME_ROOT/templates/profile/settings.json" "$PROFILE_DIR/settings.json"
cp "$RUNTIME_ROOT/templates/profile/SYSTEM.md" "$PROFILE_DIR/SYSTEM.md"
if [[ -d "$RUNTIME_ROOT/templates/profile/skills" ]]; then
  mkdir -p "$PROFILE_DIR/skills"
  cp -R "$RUNTIME_ROOT/templates/profile/skills/." "$PROFILE_DIR/skills/"
fi

for name in siso siso-agent siso-update siso-doctor siso-where; do
  cp "$RUNTIME_ROOT/bin/$name" "$BIN_DIR/$name"
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
