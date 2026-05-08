# Tailscale Setup

SISO Agent Base reaches Shaan's Mac Mini through Tailscale. The public GitHub repo is not enough by itself; you need tailnet access and a personal Bifrost key.

## Steps

1. Install Tailscale from <https://tailscale.com/download>.
2. Log in with the Gmail account Shaan invited.
3. Open:

   ```text
   https://shaans-mac-mini.tail100d11.ts.net:8443/health
   ```

4. Expected response:

   ```json
   {"status":"ok"}
   ```

If the health URL does not open, fix Tailscale before running the SISO installer.

