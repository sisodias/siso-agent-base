# Admin Onboarding

These notes are for Shaan.

## Create A Friend Key

Run from your laptop:

```bash
ssh mac-mini '~/bin/bifrost-keyctl create FRIEND_NAME 20 200000 200'
```

Send the generated key privately. Do not commit it to this repo.

## Revoke A Friend Key

```bash
ssh mac-mini '~/bin/bifrost-keyctl revoke FRIEND_NAME'
```

## Check Usage

```bash
ssh mac-mini '~/bin/bifrost-keyctl usage 24'
```

## Friend Message Template

```text
Install SISO Agent Base:

1. Install Tailscale: https://tailscale.com/download
2. Log in with the Gmail I invited.
3. Open: https://shaans-mac-mini.tail100d11.ts.net:8443/health
4. Run:
   curl -fsSL https://raw.githubusercontent.com/Lordsisodia/siso-agent-base/main/install.sh | bash
5. Paste the key I sent privately.
6. Run:
   siso doctor
   siso
```

