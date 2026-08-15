import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const html = existsSync('dist/index.html')
  ? readFileSync('dist/index.html', 'utf8')
  : '';

test('the site builds an index page', () => {
  assert.ok(existsSync('dist/index.html'), 'run `npm run build` first');
});

test('the page names Mansoor Ameen', () => {
  assert.match(html, /Mansoor Ameen/);
});
