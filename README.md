# SISO Agent Base

SISO Agent Base installs a local coding-agent launcher that connects to Shaan's private Mac Mini Bifrost gateway over Tailscale.

The repo is public and safe to share. It does not contain Bifrost keys, OAuth tokens, model-provider secrets, or Mac Mini private files. Each person gets their own key from Shaan and stores it only on their own machine.

## Install

1. Install Tailscale: <https://tailscale.com/download>
2. Log in with the Gmail account Shaan invited.
3. Confirm the gateway health page opens:

   ```text
   https://shaans-mac-mini.tail100d11.ts.net:8443/health
   ```

4. Run the installer:

   ```bash
   curl -fsSL https://raw.githubusercontent.com/Lordsisodia/siso-agent-base/main/install.sh | bash
   ```

5. Paste your personal SISO Bifrost key when prompted.
6. Start the agent:

   ```bash
   siso
   ```

## Commands

```bash
siso          # start the agent
siso doctor   # verify Tailscale, gateway, key, Pi, and model routing
siso update   # pull the latest SISO Agent Base release
siso version  # show local install version and gateway config
```

## Model Overrides

```bash
SISO_MODEL=claude-haiku-4-5-20251001 siso   # MiniMax
SISO_MODEL=claude-sonnet-4-6 siso           # Spark
SISO_MODEL=claude-opus-4-7 siso             # GPT-5.5 / oracle route
SISO_MODEL=gpt-5.4-mini siso                # GPT-5.4 Mini
```

## Gateway

```text
Health:
https://shaans-mac-mini.tail100d11.ts.net:8443/health

Anthropic-compatible:
https://shaans-mac-mini.tail100d11.ts.net:8443/anthropic

OpenAI-compatible:
https://shaans-mac-mini.tail100d11.ts.net:8443/openai/v1
```

Access requires both Tailscale and a valid Bifrost virtual key.

## Update

```bash
siso update
```

The updater preserves your local key and local profile secrets.

## Troubleshooting

Run:

```bash
siso doctor
```

Common fixes are documented in [docs/troubleshooting.md](docs/troubleshooting.md).

