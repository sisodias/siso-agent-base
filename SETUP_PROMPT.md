# SISO Agent Base Setup Prompt

Send this to someone after they have installed Tailscale and you have privately sent them their Bifrost key.

Replace `PASTE_YOUR_KEY_HERE` before sending, or tell them to paste the key only when the installer asks.

```text
Set up SISO Agent Base on my machine.

Context:
- Repo: https://github.com/sisodias/siso-agent-base
- Gateway health: https://shaans-mac-mini.tail100d11.ts.net:8443/health
- Anthropic base URL: https://shaans-mac-mini.tail100d11.ts.net:8443/anthropic
- OpenAI base URL: https://shaans-mac-mini.tail100d11.ts.net:8443/openai/v1
- My Bifrost key: PASTE_YOUR_KEY_HERE

Requirements:
1. Do not print, log, or expose my Bifrost key.
2. Verify Tailscale can reach the gateway health URL.
3. Install SISO Agent Base with:
   curl -fsSL https://raw.githubusercontent.com/sisodias/siso-agent-base/main/install.sh | bash
4. If the installer asks for my key, paste it into stdin without echoing it elsewhere.
5. Run:
   siso doctor
6. If doctor passes, tell me:
   - install path
   - profile path
   - how to start SISO
   - how to update SISO
7. If doctor fails, summarize only the failing checks and the next fix. Do not include the key.
```

Manual install command:

```bash
curl -fsSL https://raw.githubusercontent.com/sisodias/siso-agent-base/main/install.sh | bash
```

