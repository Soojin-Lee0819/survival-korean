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

## Deployment

Deployed to GitHub Pages via the workflow at `.github/workflows/deploy.yml`.
The workflow runs on every push to `main` and publishes the build output to the
`gh-pages` environment.

The Vite `base` is automatically set to `/survival-korean/` when the workflow
runs (via `GITHUB_ACTIONS` env var) so all assets resolve correctly under the
GitHub Pages subpath.
