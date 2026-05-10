# Mac Mini Bifrost Boys Gateway Handoff

Date: 2026-05-07

## Bottom Line

The Mac Mini is now a private AI gateway over Tailscale. Friends do not SSH into it. They join Tailscale, receive their own Bifrost virtual key, and point Claude Code / Pi / SISO at the gateway endpoint.

```text
Friend laptop
  -> Tailscale identity
  -> https://shaans-mac-mini.tail100d11.ts.net:8443
  -> Mac Mini Bifrost on 127.0.0.1:8080
  -> friend-specific Bifrost virtual key
  -> CodexOpenAI / MiniMax provider accounts
```

Security layers:

1. Tailscale access is required to reach the gateway.
2. Bifrost virtual key is required for inference.
3. Every friend gets a separate key.
4. Usage is logged per key.
5. Keys can be revoked independently.

No-key requests have been verified to return HTTP 401.

## Gateway Endpoints

```text
Health:
https://shaans-mac-mini.tail100d11.ts.net:8443/health

Anthropic-compatible:
https://shaans-mac-mini.tail100d11.ts.net:8443/anthropic

OpenAI-compatible:
https://shaans-mac-mini.tail100d11.ts.net:8443/openai/v1
```

## Current Friend Keys

Secrets are not stored in this repo. Key files live only on the Mac Mini:

```text
~/bifrost-issued-keys/cam-unlimited.txt
~/bifrost-issued-keys/alex-tracking.txt
```

Configured keys:

```text
CAM Unlimited Key
Alex Tracking Key
MacBook Unlimited Key
testboy Claude Code Key
MiniMax Workers Key
```

CAM and Alex are currently tracking-only / unlimited keys with access to:

```text
CodexOpenAI:
  gpt-5.5
  gpt-5.3-codex-spark
  gpt-5.4-mini
  gpt-5.4
  gpt-5.3-codex
  gpt-5.2

Minimax:
  MiniMax-M2.7-highspeed
```

## Admin Commands

Run from your laptop:

```bash
ssh mac-mini '~/bin/bifrost-keyctl list'
ssh mac-mini '~/bin/bifrost-keyctl usage 24'
ssh mac-mini '~/bin/bifrost-keyctl create alex 10 100000 100'
ssh mac-mini '~/bin/bifrost-keyctl revoke alex'
ssh mac-mini '~/bin/bifrost-gateway-doctor'
ssh mac-mini 'tailscale serve status'
```

Command meanings:

```text
list              show virtual keys
usage 24          show usage for last 24 hours
create NAME ...   create capped default key: budget, tokens/hour, requests/hour
revoke NAME       deactivate matching key
gateway-doctor    verify Bifrost health, no-key rejection, valid-key success
```

To view issued secret files:

```bash
ssh mac-mini 'cat ~/bifrost-issued-keys/alex-tracking.txt'
ssh mac-mini 'cat ~/bifrost-issued-keys/cam-unlimited.txt'
```

Do not paste these into public chats or repos.

## Creating a New Unlimited Tracking Key

The current `bifrost-keyctl create` creates a capped key. For now, use it for capped keys. For unlimited tracking-only keys, copy the CAM/Alex pattern or ask an agent to create:

- `governance_virtual_keys` row with no `budget_id` / `rate_limit_id`
- `governance_virtual_key_provider_configs` for CodexOpenAI and Minimax
- `governance_virtual_key_provider_config_keys` linking to:
  - `CodexOpenAI ChatGPT Pro Codex OAuth`
  - `Minimax $80`

After DB edits, restart Bifrost:

```bash
ssh mac-mini 'launchctl kickstart -k gui/$(id -u)/com.maximhq.bifrost'
```

Then test with the new key.

## Friend Manual Setup

Before agent setup, friend must:

1. Install Tailscale.
2. Log in with Gmail.
3. Be invited/shared into Shaan's tailnet or given access to the Mac Mini.
4. Confirm this opens:

```text
https://shaans-mac-mini.tail100d11.ts.net:8443/health
```

Expected:

```json
{"status":"ok"}
```

## Friend Agent Setup Prompt

Replace `PASTE_THEIR_KEY_HERE` with their personal key before sending.

```text
Set up my local SISO/Pi agent to use Shaan's private Mac Mini Bifrost gateway.

Gateway:
- Anthropic base URL: https://shaans-mac-mini.tail100d11.ts.net:8443/anthropic
- OpenAI base URL: https://shaans-mac-mini.tail100d11.ts.net:8443/openai/v1
- Virtual key: PASTE_THEIR_KEY_HERE

Requirements:
1. Do not print or expose the virtual key in logs/output.
2. Create an isolated Pi/SISO profile at ~/.siso/agent/profiles/shaan-mac-gateway
3. Write models.json in that profile with provider `bifrost-anthropic`:
   - api: anthropic-messages
   - baseUrl: the Anthropic base URL above
   - apiKey: the virtual key above
   - models:
     - claude-haiku-4-5-20251001 named MiniMax
     - claude-sonnet-4-6 named Codex Spark
     - claude-opus-4-7 named GPT-5.5
     - gpt-5.4-mini named GPT-5.4 Mini
4. Write settings.json with defaultProvider bifrost-anthropic, defaultModel claude-opus-4-7, transport sse, quietStartup true.
5. Write SYSTEM.md with a short concise coding-agent instruction.
6. Create ~/bin/siso-shaan that sets PI_CODING_AGENT_DIR to the profile and runs `siso` if installed, otherwise `pi`.
7. Make ~/bin/siso-shaan executable.
8. Test health and run:
   ~/bin/siso-shaan --no-session --no-tools --no-skills --no-context-files --no-extensions --mode json -p "Reply exactly: SHAAN_GATEWAY_OK"
9. Final response should only say whether health passed, whether siso-shaan passed, created path, and how to run it. Do not include the key.
```

## Friend Runtime Commands

After setup:

```bash
siso-shaan
```

Model overrides:

```bash
SISO_MODEL=claude-haiku-4-5-20251001 siso-shaan   # MiniMax
SISO_MODEL=claude-sonnet-4-6 siso-shaan           # Codex Spark
SISO_MODEL=claude-opus-4-7 siso-shaan             # GPT-5.5
SISO_MODEL=gpt-5.4-mini siso-shaan                # GPT-5.4 Mini
```

Claude Code env:

```bash
export ANTHROPIC_BASE_URL="https://shaans-mac-mini.tail100d11.ts.net:8443/anthropic"
export ANTHROPIC_AUTH_TOKEN="THEIR_SK_BF_KEY"
claude
```

OpenAI-compatible env:

```bash
export OPENAI_BASE_URL="https://shaans-mac-mini.tail100d11.ts.net:8443/openai/v1"
export OPENAI_API_KEY="THEIR_SK_BF_KEY"
```

## Verification Commands

No-key rejection:

```bash
curl -sS -w '\nHTTP:%{http_code}\n' \
  'https://shaans-mac-mini.tail100d11.ts.net:8443/openai/v1/chat/completions' \
  -H 'Content-Type: application/json' \
  -d '{"model":"gpt-5.4-mini","messages":[{"role":"user","content":"Reply OK"}],"max_tokens":8}'
```

Expected: HTTP 401.

Valid-key test:

```bash
curl -sS \
  'https://shaans-mac-mini.tail100d11.ts.net:8443/openai/v1/chat/completions' \
  -H 'Authorization: Bearer THEIR_SK_BF_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"model":"gpt-5.4-mini","messages":[{"role":"user","content":"Reply exactly: GATEWAY_OK"}],"max_tokens":16}'
```

Expected response contains `GATEWAY_OK`.

Check usage:

```bash
ssh mac-mini '~/bin/bifrost-keyctl usage 24'
```

## Recovery / Disable

Disable Tailscale Serve Bifrost gateway:

```bash
ssh mac-mini 'tailscale serve --https=8443 off'
```

Restart Bifrost:

```bash
ssh mac-mini 'launchctl kickstart -k gui/$(id -u)/com.maximhq.bifrost'
```

Restore latest Bifrost DB backup if a key edit breaks config:

```bash
ssh mac-mini 'ls -t ~/.config/bifrost/config.db.bak-* | head'
```

Then copy chosen backup over `config.db` and restart Bifrost.

## Current Known-Good Verification

Tested from Shaan's laptop:

```text
Alex Tracking Key -> siso/Pi via gateway -> CodexOpenAI gpt-5.5 -> success
CAM Unlimited Key -> siso/Pi via gateway -> CodexOpenAI gpt-5.5 -> success
```

Latest log shape:

```text
virtual_key_name | provider     | model   | status  | total_tokens
Alex Tracking Key| CodexOpenAI  | gpt-5.5 | success | ...
CAM Unlimited Key| CodexOpenAI  | gpt-5.5 | success | ...
```
