# Troubleshooting

Run:

```bash
siso doctor
```

## Gateway Unreachable

Check Tailscale:

```bash
tailscale status
```

Then open:

```text
https://shaans-mac-mini.tail100d11.ts.net:8443/health
```

If this does not work, ask Shaan to confirm you are invited to the tailnet.

## Key Rejected

Your Bifrost key may be missing, expired, revoked, or pasted incorrectly.

Rerun the installer with:

```bash
rm -f ~/.siso/agent/secrets.env
curl -fsSL https://raw.githubusercontent.com/Lordsisodia/siso-agent-base/main/install.sh | bash
```

Paste the key again. Do not paste the key into GitHub, Discord, Slack, or public chats.

## Pi Missing

If `siso doctor` says Pi is missing, install Pi or ask Shaan for the current Pi install command.

## Stale Local Routing

The doctor checks for old local routes:

```text
127.0.0.1:8080
localhost:8080
codex-proxy-local-key
```

These should not appear in your active SISO profile.

