import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const DIST = join(ROOT, 'dist');

function readDist(filename) {
  const path = join(DIST, filename);
  if (!existsSync(path)) {
    throw new Error(`Missing built file: ${path}. Did you run \`npm run build\`?`);
  }
  return readFileSync(path, 'utf8');
}

test('dist/index.html exists', () => {
  assert.ok(existsSync(join(DIST, 'index.html')), 'dist/index.html should exist after build');
});

test('built HTML has no literal %BASE_URL% placeholders', () => {
  const html = readDist('index.html');
  assert.ok(!html.includes('%BASE_URL%'), 'Vite should substitute %BASE_URL% during build');
});

test('built HTML does not reference unbundled /src/main.jsx', () => {
  const html = readDist('index.html');
  assert.ok(
    !html.includes('/src/main.jsx'),
    'Production HTML must not reference /src/main.jsx (means raw source served instead of dist)'
  );
});

test('built HTML loads bundled JS from /assets/ at root base', () => {
  const html = readDist('index.html');
  assert.ok(
    /src="\/assets\/index-[^"]+\.js"/.test(html),
    'Bundled JS must be loaded from root-relative /assets/ for Vercel'
  );
});

test('built HTML loads bundled CSS from /assets/ at root base', () => {
  const html = readDist('index.html');
  assert.ok(
    /href="\/assets\/index-[^"]+\.css"/.test(html),
    'Bundled CSS must be loaded from root-relative /assets/ for Vercel'
  );
});

test('manifest link in HTML resolves at root', () => {
  const html = readDist('index.html');
  assert.ok(
    /href="(manifest\.json|\/manifest\.json)"/.test(html),
    'manifest href must be relative or root-absolute'
  );
});

test('icon link in HTML resolves at root', () => {
  const html = readDist('index.html');
  assert.ok(
    /href="(vite\.svg|\/vite\.svg)"/.test(html),
    'favicon must be relative or root-absolute'
  );
});

test('manifest.json copied into dist', () => {
  assert.ok(existsSync(join(DIST, 'manifest.json')), 'manifest.json must be served alongside index.html');
});

test('manifest.json has root start_url and scope (Vercel root deploy)', () => {
  const manifest = JSON.parse(readDist('manifest.json'));
  assert.equal(manifest.start_url, '/', `start_url must be "/" for root deploy, got: ${manifest.start_url}`);
  assert.equal(manifest.scope, '/', `scope must be "/" for root deploy, got: ${manifest.scope}`);
});

test('manifest.json icons use root-absolute paths', () => {
  const manifest = JSON.parse(readDist('manifest.json'));
  for (const icon of manifest.icons || []) {
    assert.ok(
      icon.src.startsWith('/'),
      `icon.src must be root-absolute for Vercel: ${icon.src}`
    );
  }
});

test('service worker copied into dist', () => {
  assert.ok(existsSync(join(DIST, 'sw.js')), 'sw.js must be served from dist');
});

test('service worker has no hardcoded bare paths (uses registration scope)', () => {
  const sw = readDist('sw.js');
  assert.ok(
    /self\.registration\?\.scope/.test(sw),
    'sw.js should derive scope from self.registration.scope'
  );
});

test('vite.svg copied into dist (referenced by manifest icons)', () => {
  assert.ok(existsSync(join(DIST, 'vite.svg')), 'vite.svg must exist in dist');
});

test('vercel.json exists at project root', () => {
  assert.ok(existsSync(join(ROOT, 'vercel.json')), 'vercel.json must exist for Vercel deploys');
});

test('vercel.json declares Vite framework and dist output', () => {
  const cfg = JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf8'));
  assert.equal(cfg.framework, 'vite', 'vercel.json framework must be "vite"');
  assert.equal(cfg.outputDirectory, 'dist', 'vercel.json outputDirectory must be "dist"');
});

test('vercel.json includes SPA rewrite for client-side routes', () => {
  const cfg = JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf8'));
  assert.ok(Array.isArray(cfg.rewrites) && cfg.rewrites.length > 0, 'vercel.json must define rewrites');
  const hasSpaRewrite = cfg.rewrites.some(
    (r) => r.destination === '/index.html'
  );
  assert.ok(hasSpaRewrite, 'vercel.json must rewrite unmatched routes to /index.html');
});

test('vercel.json sets no-cache header for sw.js', () => {
  const cfg = JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf8'));
  const swHeader = (cfg.headers || []).find((h) => h.source === '/sw.js');
  assert.ok(swHeader, 'vercel.json must define headers for /sw.js');
  const cacheControl = swHeader.headers.find((h) => h.key === 'Cache-Control');
  assert.ok(
    cacheControl && /no-cache|no-store/.test(cacheControl.value),
    'sw.js must have no-cache Cache-Control to avoid stale workers'
  );
});
