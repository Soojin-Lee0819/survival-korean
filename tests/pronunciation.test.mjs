import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  decomposeHangul,
  normalizeKorean,
  scorePronunciation,
  describeScore,
} from '../src/lib/pronunciation.js';

test('normalizeKorean strips whitespace and punctuation', () => {
  assert.equal(normalizeKorean('안녕 하세요!'), '안녕하세요');
  assert.equal(normalizeKorean('  보고 싶어 ~  '), '보고싶어');
  assert.equal(normalizeKorean(''), '');
  assert.equal(normalizeKorean(null), '');
});

test('decomposeHangul splits 안 into initial + medial + final', () => {
  // 안 = ㅇ + ㅏ + ㄴ → 0x110B, 0x1161, 0x11AB
  assert.deepEqual(decomposeHangul('안'), [0x110b, 0x1161, 0x11ab]);
});

test('decomposeHangul handles syllables without final consonant', () => {
  // 가 = ㄱ + ㅏ → 0x1100, 0x1161 (no final)
  assert.deepEqual(decomposeHangul('가'), [0x1100, 0x1161]);
});

test('scorePronunciation returns 100 on exact match', () => {
  const result = scorePronunciation('안녕하세요', '안녕하세요');
  assert.equal(result.score, 100);
  assert.equal(result.distance, 0);
});

test('scorePronunciation returns 100 ignoring punctuation differences', () => {
  const result = scorePronunciation('안녕, 하세요!', '안녕하세요');
  assert.equal(result.score, 100);
});

test('scorePronunciation gives high score for one-jamo difference', () => {
  // 안녕 vs 안냥 differs by one medial vowel (ㅕ vs ㅑ)
  const result = scorePronunciation('안녕', '안냥');
  // 안녕 has 6 jamo, distance is 1, so score = 100 - (1/6)*100 ≈ 83
  assert.ok(result.score >= 75 && result.score <= 90, `expected ~83, got ${result.score}`);
});

test('scorePronunciation gives 0 for empty attempt', () => {
  const result = scorePronunciation('안녕하세요', '');
  assert.equal(result.score, 0);
});

test('scorePronunciation returns null for empty target', () => {
  assert.equal(scorePronunciation('', '안녕'), null);
});

test('describeScore tiers', () => {
  assert.equal(describeScore(100).tier, 'perfect');
  assert.equal(describeScore(85).tier, 'great');
  assert.equal(describeScore(60).tier, 'almost');
  assert.equal(describeScore(35).tier, 'rough');
  assert.equal(describeScore(0).tier, 'miss');
  assert.equal(describeScore(null).tier, 'none');
});
