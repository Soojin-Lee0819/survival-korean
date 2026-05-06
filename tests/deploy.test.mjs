import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIST = join(process.cwd(), 'dist');

function readDist(filename) {
  const path = join(DIST, filename);
  if (!existsSync(path)) {
    throw new Error(`Missing built file: ${path}. Did you run \`GITHUB_ACTIONS=1 npm run build\`?`);
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
    'Production HTML must not reference /src/main.jsx (means dist served instead of build output)'
  );
});

test('built HTML loads bundled JS from /survival-korean/assets/', () => {
  const html = readDist('index.html');
  const match = html.match(/src="(\/survival-korean\/assets\/index-[^"]+\.js)"/);
  assert.ok(match, 'Bundled JS must be loaded from /survival-korean/assets/ on Pages');
});

test('built HTML loads bundled CSS from /survival-korean/assets/', () => {
  const html = readDist('index.html');
  const match = html.match(/href="(\/survival-korean\/assets\/index-[^"]+\.css)"/);
  assert.ok(match, 'Bundled CSS must be loaded from /survival-korean/assets/ on Pages');
});

test('manifest link in HTML is resolvable relative to subpath', () => {
  const html = readDist('index.html');
  // Either relative ("manifest.json") or absolute base-prefixed ("/survival-korean/manifest.json")
  // are acceptable. Anything containing %BASE_URL% or bare "/manifest.json" is broken.
  assert.ok(
    /href="(manifest\.json|\/survival-korean\/manifest\.json)"/.test(html),
    'manifest href must be relative or include base prefix'
  );
  assert.ok(!/href="\/manifest\.json"/.test(html), 'manifest must not use bare root path');
});

test('icon link in HTML is resolvable relative to subpath', () => {
  const html = readDist('index.html');
  assert.ok(
    /href="(vite\.svg|\/survival-korean\/vite\.svg)"/.test(html),
    'favicon must be relative or include base prefix'
  );
  assert.ok(!/href="\/vite\.svg"/.test(html), 'favicon must not use bare root path');
});

test('manifest.json copied into dist', () => {
  assert.ok(existsSync(join(DIST, 'manifest.json')), 'manifest.json must be served alongside index.html');
});

test('manifest.json has scope-friendly start_url and scope', () => {
  const manifest = JSON.parse(readDist('manifest.json'));
  assert.ok(
    manifest.start_url === './' || manifest.start_url === '/survival-korean/',
    `start_url must work under /survival-korean/ subpath, got: ${manifest.start_url}`
  );
  if (manifest.scope) {
    assert.ok(
      manifest.scope === './' || manifest.scope === '/survival-korean/',
      `scope must work under /survival-korean/ subpath, got: ${manifest.scope}`
    );
  }
});

test('manifest.json icons use relative or base-prefixed paths', () => {
  const manifest = JSON.parse(readDist('manifest.json'));
  for (const icon of manifest.icons || []) {
    assert.ok(
      !icon.src.startsWith('/') || icon.src.startsWith('/survival-korean/'),
      `icon.src must not be a bare root path: ${icon.src}`
    );
  }
});

test('service worker copied into dist', () => {
  assert.ok(existsSync(join(DIST, 'sw.js')), 'sw.js must be served from dist');
});

test('service worker has no hardcoded bare root paths', () => {
  const sw = readDist('sw.js');
  assert.ok(
    !/['"]\/manifest\.json['"]/.test(sw) && !/['"]\/['"]/.test(sw),
    'sw.js must not hardcode "/manifest.json" or "/" — must derive from registration scope'
  );
});

test('vite.svg copied into dist (referenced by manifest icons)', () => {
  assert.ok(existsSync(join(DIST, 'vite.svg')), 'vite.svg must exist in dist');
});

test('GitHub Actions workflow exists for Pages deployment', () => {
  const wf = join(process.cwd(), '.github/workflows/deploy.yml');
  assert.ok(existsSync(wf), 'Pages workflow must exist');
  const content = readFileSync(wf, 'utf8');
  assert.ok(content.includes('actions/deploy-pages'), 'workflow must use actions/deploy-pages');
  assert.ok(content.includes('npm run build'), 'workflow must run npm run build');
});
