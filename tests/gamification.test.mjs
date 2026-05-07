import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LEVELS,
  levelFor,
  xpForScore,
  recordScore,
  BADGES,
} from '../src/lib/gamification.js';

test('levelFor at 0 returns Level 1', () => {
  const info = levelFor(0);
  assert.equal(info.level, 1);
  assert.equal(info.ko, '초보');
  assert.equal(info.progress, 0);
});

test('levelFor crosses tier thresholds correctly', () => {
  assert.equal(levelFor(59).level, 1);
  assert.equal(levelFor(60).level, 2);
  assert.equal(levelFor(180).level, 3);
  assert.equal(levelFor(360).level, 4);
  assert.equal(levelFor(600).level, 5);
});

test('levelFor at top tier reports 100% progress', () => {
  const info = levelFor(800);
  assert.equal(info.level, 5);
  assert.equal(info.progress, 1);
});

test('levelFor handles invalid xp gracefully', () => {
  assert.equal(levelFor(null).level, 1);
  assert.equal(levelFor(-50).level, 1);
});

test('xpForScore scales with score tier', () => {
  assert.equal(xpForScore(95).amount, 24);
  assert.equal(xpForScore(80).amount, 14);
  assert.equal(xpForScore(60).amount, 8);
  assert.equal(xpForScore(30).amount, 3);
  assert.equal(xpForScore(10).amount, 1);
  assert.equal(xpForScore(null).amount, 5); // fallback for unsupported
});

test('recordScore tracks best, attempts, last for a phrase', () => {
  let scores = {};
  scores = recordScore(scores, 'd1-1', 70);
  scores = recordScore(scores, 'd1-1', 90);
  scores = recordScore(scores, 'd1-1', 50);
  assert.equal(scores['d1-1'].best, 90);
  assert.equal(scores['d1-1'].attempts, 3);
  assert.equal(scores['d1-1'].last.score, 50);
});

test('LEVELS is monotonically increasing', () => {
  for (let i = 1; i < LEVELS.length; i++) {
    assert.ok(LEVELS[i].min > LEVELS[i - 1].min);
  }
});

test('every BADGES entry has required fields', () => {
  for (const [id, badge] of Object.entries(BADGES)) {
    assert.equal(badge.id, id);
    assert.ok(badge.name && badge.desc && badge.glyph);
    assert.ok(typeof badge.paletteIdx === 'number');
  }
});
