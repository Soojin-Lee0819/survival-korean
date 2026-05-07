# Survival Korean

A mobile-first PWA that helps non-Korean speakers practice useful spoken Korean
through a 7-day "Survival Korean" plan, custom phrase generation, and
listen-and-repeat practice.

## Tech

- React + Vite
- Tailwind CSS
- PWA (manifest + service worker)
- Web Speech API (Korean TTS)
- MediaRecorder API (record-and-replay)

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
```

## Deployment (Vercel)

Configured for Vercel via `vercel.json`. Vite builds at root base (`/`),
manifest + service worker register at root scope, and an SPA rewrite sends
unmatched routes back to `index.html`.

### One-time setup

1. Push `main` to GitHub (already done).
2. Go to <https://vercel.com/new>, **Import** the `survival-korean` repo.
3. Vercel auto-detects Vite from `vercel.json` — just click **Deploy**.

Every subsequent push to `main` triggers an automatic production deploy.
Pull request branches get preview URLs.

### Verify locally

```bash
npm run verify
```

This builds the project and runs `tests/deploy.test.mjs` (17 invariants
covering bundled asset paths, manifest scope, service worker portability,
and `vercel.json` rewrite/header rules).
