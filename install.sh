#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${SISO_AGENT_BASE_REPO:-https://github.com/sisodias/siso-agent-base.git}"
INSTALL_DIR="${SISO_AGENT_BASE_DIR:-$HOME/.siso-agent-base}"

if [[ -d "$INSTALL_DIR/.git" ]]; then
  git -C "$INSTALL_DIR" pull --ff-only
else
  rm -rf "$INSTALL_DIR"
  git clone "$REPO_URL" "$INSTALL_DIR"
fi

exec "$INSTALL_DIR/scripts/install-local.sh" "$@"

