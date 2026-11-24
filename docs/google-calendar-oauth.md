# Google Calendar OAuth (A.S.U.N.A. Desktop)

This document matches the implemented Electron main-process OAuth flow.

## Redirect URI

- Host: `127.0.0.1`
- Port: ephemeral (assigned by `server.listen(0)`)
- Path: `/oauth/callback`
- Example: `http://127.0.0.1:54321/oauth/callback`

The port changes each connect attempt. The Desktop OAuth client type is used with **PKCE (S256)** and the matching **client secret** (main process only; never exposed to the renderer).

## Scopes

- `https://www.googleapis.com/auth/calendar.calendarlist.readonly`
- `https://www.googleapis.com/auth/calendar.events.readonly`

## Environment

Set in the project root `.env` (loaded by `vite.main.config.ts`):

```
GOOGLE_OAUTH_CLIENT_ID=your-desktop-client-id.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=your-desktop-client-secret
```

## Google Cloud Console setup

1. Create or select a GCP project.
2. Enable **Google Calendar API**.
3. Configure the **OAuth consent screen** (Testing or Production).
4. Add the two scopes above to the consent screen.
5. Create an **OAuth client ID** with application type **Desktop app**.
6. Copy the **Client ID** and **Client secret** into `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_SECRET`.
7. For Desktop clients, Google accepts loopback redirects dynamically; no fixed port registration is required for the ephemeral redirect used here.
8. Add test users while the app is in Testing mode.

## Token and cache storage

- Tokens: `userData/calendar-auth/<supabaseUserId>.bin` (encrypted with Electron `safeStorage`)
- Calendar cache: `userData/calendar-cache/<supabaseUserId>.bin` (encrypted)

Supabase sign-out does **not** delete these files. **Disconnect Google Calendar** in Settings revokes and deletes them.
