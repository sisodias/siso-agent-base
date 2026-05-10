#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${SISO_AGENT_BASE_REPO:-https://github.com/sisodias/siso-agent-base.git}"
INSTALL_DIR="${SISO_AGENT_BASE_DIR:-$HOME/.siso-agent-base}"
MARKER=".siso-agent-base-install"

fail() { printf 'siso install: %s\n' "$*" >&2; exit 1; }

dir_has_entries() {
  [[ -d "$1" ]] && find "$1" -mindepth 1 -maxdepth 1 -print -quit | grep -q .
}

validate_install_dir() {
  [[ -n "${INSTALL_DIR:-}" ]] || fail "SISO_AGENT_BASE_DIR must not be empty"
  [[ "$INSTALL_DIR" = /* ]] || fail "SISO_AGENT_BASE_DIR must be an absolute path: $INSTALL_DIR"
  [[ "$INSTALL_DIR" != "/" ]] || fail "refusing to install into /"
  [[ "$INSTALL_DIR" != "$HOME" ]] || fail "refusing to install into HOME: $HOME"
  if [[ -d "$INSTALL_DIR" && ! -e "$INSTALL_DIR/$MARKER" ]] && dir_has_entries "$INSTALL_DIR"; then
    fail "refusing non-empty unmarked install dir: $INSTALL_DIR (expected $MARKER)"
  fi
}

write_marker() {
  {
    printf 'SISO_AGENT_BASE_INSTALL=1\n'
    printf 'repo=%s\n' "$REPO_URL"
  } > "$INSTALL_DIR/$MARKER"
}

validate_install_dir

if [[ -d "$INSTALL_DIR/.git" ]]; then
  git -C "$INSTALL_DIR" pull --ff-only
elif [[ -d "$INSTALL_DIR" ]] && dir_has_entries "$INSTALL_DIR"; then
  fail "install dir is marked but is not a git checkout: $INSTALL_DIR; use siso update with SISO_AGENT_BASE_SOURCE_DIR or choose an empty SISO_AGENT_BASE_DIR"
else
  git clone "$REPO_URL" "$INSTALL_DIR"
fi
write_marker

exec "$INSTALL_DIR/scripts/install-local.sh" "$@"
