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

test('the page declares a viewport for mobile', () => {
  assert.match(html, /name="viewport" content="width=device-width/);
});

test('social cards get an absolute image URL', () => {
  assert.match(html, /property="og:image" content="https:\/\//);
});

test('the google site verification token is preserved', () => {
  assert.match(html, /O7EjhQgHhRfxUaWkLhkMzkx0YW1UdKvvPmZ9fbsVVAg/);
});

import profile from '../content/profile.json' with { type: 'json' };

test('the resume link downloads a PDF rather than opening a Doc', () => {
  assert.match(profile.links.resume, /export\?format=pdf$/);
});

test('no contact placeholder survives from the old site', () => {
  assert.doesNotMatch(html, /your-email@gmail\.com/);
});

test('banned copy stays out of the page', () => {
  for (const banned of [/10x/i, /rockstar/i, /\bninja\b/i, /4\+ years/]) {
    assert.doesNotMatch(html, banned);
  }
});

test('the hero carries the AI-first signal', () => {
  assert.match(html, /AI-first engineer/);
  assert.match(html, /I work AI-first/);
});

test('the proof strip renders all four stats', () => {
  for (const stat of profile.stats) {
    assert.ok(html.includes(stat.label), `missing stat: ${stat.label}`);
  }
});
