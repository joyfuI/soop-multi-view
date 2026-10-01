import assert from 'node:assert/strict';

import {
  makeIdsPath,
  normalizeId,
  normalizeIds,
  parseIds,
} from '../src/helper/ids.ts';

const validIds = ['a', 'today', '9mogu9', 'ABC123', 'abcdefghijkl'];
for (const id of validIds) {
  assert.equal(normalizeId(` ${id} `), id);
  assert.deepEqual(parseIds(makeIdsPath([id])), [id]);
}

const invalidIds = [
  '',
  ' ',
  '.',
  '..',
  '../..',
  '%2e%2e',
  'https://example.com',
  '//example.com',
  '\\example.com',
  'javascript:alert(1)',
  'user/direct?fromApi=0#',
  'user?x=1#',
  '<img src=x onerror=alert(1)>',
  'user name',
  'user\nname',
  'user\0name',
  '__proto__',
  '한글',
  'abcdefghijklm',
  '\uD800',
];
for (const id of invalidIds) {
  assert.equal(normalizeId(id), null);
  assert.deepEqual(
    parseIds(`/alpha/${encodeURIComponent(id.toWellFormed())}`),
    ['alpha'],
  );
  assert.equal(makeIdsPath(['alpha', 'beta', id]), '/alpha/beta');
}

assert.deepEqual(parseIds('/alpha/%E0%A4%A/%/beta/%20alpha%20'), [
  'alpha',
  'beta',
]);
assert.deepEqual(
  normalizeIds([' alpha ', null, 1, {}, '..', 'alpha', 'beta']),
  ['alpha', 'beta'],
);
for (const value of [null, 1, {}, true]) {
  assert.equal(normalizeId(value), null);
  assert.deepEqual(normalizeIds(value), []);
}
assert.deepEqual(normalizeIds('alpha'), []);
assert.equal(makeIdsPath([]), '/');
assert.deepEqual(parseIds('/'), []);
console.log('SOOP ID validation checks passed');
