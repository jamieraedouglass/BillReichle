import { test } from 'node:test';
import assert from 'node:assert/strict';
import { esc, fmt, isValidEmail } from './_lib.ts';

test('esc escapes angle brackets and quotes', () => {
  assert.equal(esc('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;');
  assert.equal(esc('Tom & "Jerry"'), 'Tom &amp; &quot;Jerry&quot;');
  assert.equal(esc('plain text'), 'plain text');
});

test('fmt adds thousands separators', () => {
  assert.equal(fmt(245), '$245');
  assert.equal(fmt(1200), '$1,200');
});

test('isValidEmail', () => {
  assert.ok(isValidEmail('bill@billreichle.com'));
  assert.ok(!isValidEmail('nope'));
  assert.ok(!isValidEmail('missing@domain'));
  assert.ok(!isValidEmail('two parts@example.com'));
});
