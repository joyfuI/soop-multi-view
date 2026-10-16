import assert from 'node:assert/strict';

import {
  createUserscriptCheck,
  getBrowserFamily,
} from '../src/helper/userscript.ts';

for (const [userAgent, expected] of [
  ['Mozilla/5.0 Chrome/155.0.0.0 Safari/537.36', 'chromium'],
  ['Mozilla/5.0 Chrome/155.0.0.0 Safari/537.36 Edg/155.0.0.0', 'chromium'],
  ['Mozilla/5.0 Chromium/155.0.0.0', 'chromium'],
  ['Mozilla/5.0 Chrome/155.0.0.0 OPR/130.0.0.0', 'chromium'],
  ['Mozilla/5.0 Gecko/20100101 Firefox/155.0', 'firefox'],
  ['Mozilla/5.0 Version/26.0 Safari/605.1.15', 'other'],
  ['Mozilla/5.0 (iPhone) CriOS/155.0.0.0 Mobile Safari/604.1', 'other'],
  ['Mozilla/5.0 (iPhone) FxiOS/155.0 Mobile Safari/604.1', 'other'],
  ['', 'other'],
]) {
  assert.equal(getBrowserFamily({ userAgent }), expected);
}
assert.equal(
  getBrowserFamily({
    userAgent: '',
    userAgentData: {
      brands: [{ brand: 'Not A Brand' }, { brand: 'Chromium' }],
    },
  }),
  'chromium',
);

function createHarness() {
  const statuses = [];
  const timers = new Map();
  const sent = [];
  let nextTimer = 0;
  const page = {
    location: { origin: 'https://soop-multi-view.netlify.app' },
    postMessage(data, origin) {
      sent.push({ target: page, data, origin });
    },
    setTimeout(fn, delay) {
      assert.equal(delay, 3000);
      timers.set(++nextTimer, fn);
      return nextTimer;
    },
    clearTimeout(id) {
      timers.delete(id);
    },
  };
  globalThis.window = page;
  const check = createUserscriptCheck((status) => statuses.push(status));
  return {
    check,
    statuses,
    timers,
    sent,
    page,
    timeout() {
      const [id, fn] = [...timers][0];
      timers.delete(id);
      fn();
    },
    reply(version = 1, overrides = {}) {
      const request = sent.at(-1);
      check.receive({
        origin: request.origin,
        source: page,
        data: {
          type: 'soop-multi-view:userscript-ready',
          nonce: request.data.nonce,
          version,
        },
        ...overrides,
      });
    },
  };
}

const absent = createHarness();
assert.equal(absent.timers.size, 0);
absent.check.checkPage();
assert.deepEqual(absent.statuses, ['checking']);
assert.equal(absent.sent[0].target, absent.page);
assert.equal(absent.sent[0].origin, 'https://soop-multi-view.netlify.app');
assert.equal(absent.sent[0].data.type, 'soop-multi-view:userscript-check');
absent.timeout();
assert.equal(absent.sent.length, 2);
assert.deepEqual(absent.sent[1], absent.sent[0]);
assert.deepEqual(absent.statuses, ['checking']);
absent.timeout();
assert.equal(absent.statuses.at(-1), 'missing');
assert.equal(absent.timers.size, 0);
absent.reply();
assert.equal(absent.statuses.at(-1), 'active');

const invalid = createHarness();
invalid.check.receive({
  origin: invalid.page.location.origin,
  source: invalid.page,
  data: { type: 'soop-multi-view:userscript-ready', version: 1 },
});
assert.deepEqual(invalid.statuses, []);
invalid.check.checkPage();
for (const overrides of [
  { origin: 'https://evil.example' },
  { origin: 'https://soop-multi-view.netlify.app.evil.example' },
  { origin: 'https://play.sooplive.com' },
  { source: {} },
  { source: null },
  { data: null },
  { data: 'unrelated' },
]) {
  invalid.reply(1, overrides);
}
const validData = {
  type: 'soop-multi-view:userscript-ready',
  nonce: invalid.sent[0].data.nonce,
  version: 1,
};
for (const data of [
  { ...validData, type: 'unrelated' },
  { ...validData, nonce: 'wrong' },
  ...[0, -1, 1.5, '1', undefined, Infinity].map((version) => ({
    ...validData,
    version,
  })),
]) {
  invalid.reply(1, { data });
}
assert.deepEqual(invalid.statuses, ['checking']);
invalid.reply(2);
assert.equal(invalid.statuses.at(-1), 'active');
assert.equal(invalid.timers.size, 0);
invalid.reply();
invalid.check.checkPage();
assert.equal(invalid.sent.length, 1);
assert.deepEqual(invalid.statuses, ['checking', 'active']);

const reload = createHarness();
reload.check.checkPage();
const previous = { ...reload.sent[0].data };
reload.check.checkPage();
assert.notEqual(reload.sent[1].data.nonce, previous.nonce);
assert.equal(reload.timers.size, 1);
reload.reply(1, {
  data: { ...previous, type: 'soop-multi-view:userscript-ready', version: 1 },
});
assert.equal(reload.statuses.at(-1), 'checking');
reload.reply();
assert.equal(reload.statuses.at(-1), 'active');
assert.equal(reload.timers.size, 0);

const cleanup = createHarness();
cleanup.check.checkPage();
cleanup.check.dispose();
assert.equal(cleanup.timers.size, 0);
cleanup.reply();
assert.deepEqual(cleanup.statuses, ['checking']);
delete globalThis.window;

console.log('Userscript detection checks passed');
