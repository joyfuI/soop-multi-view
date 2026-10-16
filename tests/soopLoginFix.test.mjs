import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { setImmediate } from 'node:timers/promises';
import { runInNewContext } from 'node:vm';

const source = await readFile(
  new URL('../public/soop-login-fix.user.js', import.meta.url),
  'utf8',
);
const loginOrigin = 'https://login.sooplive.com';
const loginUrl = `${loginOrigin}/app/LoginAction.php`;
const dummyBody = 'szUid=test-only&szPassword=dummy-password';

function createHarness({
  cookies = [],
  embedded = false,
  popupBlocked = false,
  lateJquery = false,
  blockCookies = false,
  noCookieApi = false,
  isolated = false,
  holdRequest = false,
  earlyDocument = false,
  href = 'https://play.sooplive.com/alpha/direct?fromApi=1',
} = {}) {
  const jar = new Map(cookies.map((cookie) => [cookie.name, { ...cookie }]));
  const writes = [];
  const cookieReads = [];
  const requests = [];
  const completions = [];
  const warnings = [];
  const transports = [];
  const popups = [];
  const messages = [];
  const styles = [];
  const timers = new Map();
  let timerId = 0;
  const windows = [];
  const dispatch = (target, data, origin, sender) => {
    const event = new Event('message');
    Object.assign(event, { data, origin, source: sender });
    target.dispatchEvent(event);
  };
  const run = (page) =>
    runInNewContext(source, {
      ...(isolated ? { unsafeWindow: page } : { window: page }),
      URL,
      console: { warn: (...args) => warnings.push(args) },
    });
  const createWindow = (href, thirdParty = false) => {
    const page = new EventTarget();
    page.document = new EventTarget();
    page.document.createElement = (tagName) => ({ tagName, textContent: '' });
    page.document.documentElement = earlyDocument
      ? null
      : { append: (node) => styles.push(node) };
    page.location = new URL(href);
    page.top = thirdParty ? {} : page;
    page.parent = page.top;
    page.postMessage = (data, origin) =>
      messages.push({ target: page, data, origin, sender: page });
    if (thirdParty)
      page.parent.postMessage = (data, origin) =>
        messages.push({ target: page.parent, data, origin, sender: page });
    page.name = '';
    page.crypto = { randomUUID };
    page.closed = false;
    page.close = () => {
      page.closed = true;
    };
    page.setTimeout = (fn) => {
      timers.set(++timerId, { fn, interval: false });
      return timerId;
    };
    page.setInterval = (fn) => {
      timers.set(++timerId, { fn, interval: true });
      return timerId;
    };
    page.clearTimeout = page.clearInterval = (id) => timers.delete(id);
    page.cookieStore = noCookieApi
      ? undefined
      : {
          getAll: async () => {
            cookieReads.push(page);
            return [...jar.values()].filter(
              (cookie) => !thirdParty || cookie.sameSite === 'none',
            );
          },
          set: async (cookie) => {
            if (blockCookies) throw new Error('blocked');
            writes.push(cookie);
            jar.set(cookie.name, { ...cookie, secure: true });
          },
        };
    page.XMLHttpRequest = class {
      constructor() {
        requests.push(this);
        this.page = page;
        this.headers = {};
      }
      open(method, url, async) {
        Object.assign(this, { method, url, async });
      }
      setRequestHeader(name, value) {
        this.headers[name] = value;
      }
      send(data) {
        this.data = data;
      }
      abort() {
        this.aborted = true;
        this.onabort();
      }
      getAllResponseHeaders() {
        return 'Content-Type: application/json';
      }
    };
    windows.push(page);
    return page;
  };
  const page = createWindow(href, embedded);
  const jquery = {
    ajaxTransport: (types, factory) => transports.push({ types, factory }),
  };
  page.jQuery = lateJquery ? undefined : jquery;
  page.open = (url, name) => {
    if (popupBlocked) return null;
    const popup = createWindow(url);
    popup.name = name;
    popup.initialName = name;
    const send = (target, data, origin, sender) => {
      messages.push({ target, data, origin, sender });
      if (target.location.origin === origin)
        queueMicrotask(() =>
          dispatch(target, data, sender.location.origin, sender),
        );
    };
    popup.opener = {
      postMessage: (data, origin) => send(page, data, origin, popup),
    };
    popup.postMessage = (data, origin) => {
      messages.push({ target: popup, data, origin, sender: page });
      if (popup.location.origin === origin && !holdRequest)
        queueMicrotask(() =>
          dispatch(popup, data, page.location.origin, popup.opener),
        );
    };
    popups.push(popup);
    queueMicrotask(() => run(popup));
    return popup;
  };
  run(page);
  const harness = {
    page,
    jar,
    writes,
    cookieReads,
    requests,
    completions,
    warnings,
    transports,
    popups,
    messages,
    styles,
    timers,
    dispatch,
    runAgain: () => run(page),
    installJquery() {
      page.jQuery = jquery;
      page.document.dispatchEvent(new Event('pointerdown'));
    },
    createTransport: (options = {}) =>
      transports[0].factory({
        url: loginUrl,
        type: 'POST',
        hasContent: true,
        data: dummyBody,
        ...options,
      }),
    send(options = {}) {
      const transport = harness.createTransport(options);
      transport.send(
        { 'Content-Type': 'application/x-www-form-urlencoded' },
        (...args) => completions.push(args),
      );
      return transport;
    },
    async reply({ text = '{"RESULT":1}', responseURL, ticket = true } = {}) {
      const xhr = requests.at(-1);
      if (ticket)
        jar.set('AuthTicket', {
          name: 'AuthTicket',
          value: 'dummy==',
          domain: 'sooplive.com',
          path: '/',
          expires: null,
          sameSite: 'lax',
          secure: false,
        });
      Object.assign(xhr, {
        status: 200,
        statusText: 'OK',
        responseText: text,
        responseURL: responseURL || xhr.url,
      });
      await xhr.onload();
      await setImmediate();
    },
  };
  return harness;
}

for (const isolated of [false, true]) {
  const origin = 'https://soop-multi-view.netlify.app';
  const app = createHarness({ isolated, href: `${origin}/` });
  const check = {
    type: 'soop-multi-view:userscript-check',
    nonce: randomUUID(),
  };
  for (const badOrigin of [
    'https://evil.example',
    'https://play.sooplive.com',
    'https://soop-multi-view.netlify.app.evil.example',
    'http://soop-multi-view.netlify.app',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'null',
  ]) {
    app.dispatch(app.page, check, badOrigin, app.page);
  }
  app.dispatch(app.page, check, origin, {});
  app.dispatch(app.page, check, origin, null);
  for (const data of [
    null,
    { ...check, type: 'unrelated' },
    { ...check, nonce: 123 },
    { ...check, nonce: '' },
    { ...check, nonce: 'x'.repeat(36) },
  ]) {
    app.dispatch(app.page, data, origin, app.page);
  }
  assert.equal(app.messages.length, 0);
  app.dispatch(app.page, check, origin, app.page);
  const response = app.messages[0];
  assert.equal(response.origin, origin);
  assert.equal(response.target, app.page);
  assert.deepEqual(JSON.parse(JSON.stringify(response.data)), {
    type: 'soop-multi-view:userscript-ready',
    nonce: check.nonce,
    version: 1,
  });
  assert.match(source, /^\/\/ @version\s+1$/m);
  app.runAgain();
  app.dispatch(app.page, check, origin, app.page);
  assert.equal(app.messages.length, 2);
  await setImmediate();
  assert.equal(app.cookieReads.length, 0);
  assert.equal(app.writes.length, 0);
  assert.equal(app.transports.length, 0);
  assert.equal(app.styles.length, 0);
  assert.equal(app.requests.length, 0);
  assert.equal(app.timers.size, 0);
  assert.equal(app.warnings.length, 0);
  assert.ok(source.includes(`// @match        ${origin}/*`));
  assert.doesNotMatch(source, /localhost|127\.0\.0\.1/);

  for (const href of [
    'https://play.sooplive.com/alpha/direct?fromApi=1',
    'https://www.sooplive.com/',
    `${loginOrigin}/afreeca/login.php`,
  ]) {
    const soop = createHarness({ isolated, embedded: true, href });
    soop.dispatch(soop.page, check, origin, soop.page.parent);
    soop.dispatch(soop.page, check, soop.page.location.origin, soop.page);
    assert.equal(soop.messages.length, 0);
  }

  const quality = createHarness({ isolated, embedded: true, lateJquery: true });
  assert.equal(quality.styles.length, 1);
  assert.equal(quality.styles[0].tagName, 'style');
  assert.match(
    quality.styles[0].textContent,
    /^\.embeded_mode #webplayer #player \.right_ctrl \.quality_box \{ display: block !important; \}$/,
  );
  quality.runAgain();
  assert.equal(quality.styles.length, 1);

  const early = createHarness({ isolated, earlyDocument: true });
  assert.equal(early.styles.length, 0);
  early.runAgain();
  early.page.document.documentElement = {
    append: (node) => early.styles.push(node),
  };
  early.page.document.dispatchEvent(new Event('DOMContentLoaded'));
  early.page.document.dispatchEvent(new Event('DOMContentLoaded'));
  assert.equal(early.styles.length, 1);

  for (const href of [
    'https://www.sooplive.com/',
    `${loginOrigin}/afreeca/login.php`,
  ]) {
    assert.equal(createHarness({ isolated, href }).styles.length, 0);
  }
  for (const href of [
    'http://localhost:3000/',
    'http://127.0.0.1:3000/',
    'http://localhost:3001/',
    'http://127.0.0.1:3001/',
    'https://soop-multi-view.netlify.app.evil.example/',
    'https://play.sooplive.com.evil.example/',
  ]) {
    const unrelated = createHarness({ isolated, href });
    assert.equal(unrelated.cookieReads.length, 0);
    assert.equal(unrelated.transports.length, 0);
    assert.equal(unrelated.styles.length, 0);
    assert.equal(unrelated.timers.size, 0);
    assert.equal(
      unrelated.page[Symbol.for('soop-multi-view.login-fix')],
      undefined,
    );
  }
}

const existing = createHarness({
  cookies: [
    {
      name: 'AuthTicket',
      value: 'dummy',
      domain: 'sooplive.com',
      path: '/',
      expires: 1_900_000_000_000,
      sameSite: 'lax',
      secure: false,
    },
    {
      name: 'UserTicket',
      value: 'dummy-user',
      domain: '.sooplive.com',
      path: '/',
      expires: null,
      sameSite: 'lax',
      secure: false,
    },
    {
      name: 'BbsTicket',
      value: 'dummy-bbs',
      domain: 'sooplive.com',
      path: '/',
      expires: null,
      sameSite: 'none',
      secure: true,
    },
    {
      name: 'RDB',
      value: 'host-only',
      domain: null,
      path: '/',
      sameSite: 'lax',
      secure: false,
    },
    { name: 'unrelated', value: 'untouched', sameSite: 'lax', secure: false },
  ],
});
await setImmediate();
assert.equal(existing.writes.length, 2);
assert.equal(existing.jar.get('AuthTicket').expires, 1_900_000_000_000);
assert.equal(existing.jar.get('UserTicket').expires, null);
assert.equal(existing.jar.get('AuthTicket').value, 'dummy');
assert.equal(existing.jar.get('AuthTicket').sameSite, 'none');
assert.equal(existing.jar.get('AuthTicket').secure, true);
assert.equal(existing.jar.get('RDB').secure, false);
assert.equal(existing.jar.get('unrelated').secure, false);

for (const isolated of [false, true]) {
  for (const embedded of [false, true]) {
    const login = createHarness({ embedded, isolated });
    assert.equal(login.transports[0].types, '+* +script');
    for (const url of [
      'https://other.example/app/LoginAction.php',
      'https://login.sooplive.com.evil.example/app/LoginAction.php',
      'http://login.sooplive.com/app/LoginAction.php',
      'https://user:password@login.sooplive.com/app/LoginAction.php',
      'https://[invalid',
      `${loginOrigin}/unrelated`,
    ]) {
      assert.equal(login.createTransport({ url }), undefined);
    }
    assert.equal(login.createTransport({ async: false }), undefined);
    login.send();
    await setImmediate();
    assert.equal(login.requests.length, 1);
    const xhr = login.requests[0];
    assert.equal(xhr.method, 'POST');
    assert.equal(xhr.data, dummyBody);
    assert.equal(xhr.withCredentials, true);
    assert.equal(xhr.page.top, xhr.page);
    await login.reply();
    assert.equal(login.completions[0][0], 200);
    assert.equal(login.jar.get('AuthTicket').value, 'dummy==');
    assert.equal(login.jar.get('AuthTicket').sameSite, 'none');
    assert.equal(login.jar.get('AuthTicket').secure, true);
    assert.equal(login.popups.length, embedded ? 1 : 0);
    if (embedded) {
      assert.equal(login.popups[0].closed, true);
      assert.equal(login.popups[0].name, '');
      assert.doesNotMatch(
        login.popups[0].initialName + login.popups[0].location.href,
        /dummy-password|szPassword|test-only/,
      );
      assert.equal(
        login.messages.filter((m) => m.data.phase === 'request').length,
        1,
      );
      assert.ok(
        login.messages.every((m) =>
          [loginOrigin, 'https://play.sooplive.com'].includes(m.origin),
        ),
      );
      assert.equal(login.timers.size, 0);
    }
    assert.doesNotMatch(
      JSON.stringify(login.completions),
      /Set-Cookie|dummy==/i,
    );
  }
}

for (const result of [-1, -11]) {
  const rejected = createHarness({ embedded: true });
  rejected.send();
  await setImmediate();
  await rejected.reply({
    text: JSON.stringify({ RESULT: result }),
    ticket: false,
  });
  assert.equal(rejected.completions[0][0], 200);
  assert.equal(JSON.parse(rejected.completions[0][2].text).RESULT, result);
  assert.equal(rejected.writes.length, 0);
}

const jsonp = createHarness({ embedded: true });
jsonp.send({ type: 'GET', hasContent: false });
await setImmediate();
await jsonp.reply({ text: 'callback({"RESULT":1})' });
assert.equal(jsonp.requests[0].data, null);
assert.equal(jsonp.completions[0][2].text, 'callback({"RESULT":1})');
jsonp.send({
  url: `${loginOrigin}/app/LogOut.php`,
  type: 'GET',
  hasContent: false,
});
await setImmediate();
jsonp.jar.delete('AuthTicket');
await jsonp.reply({ text: 'callback({"RESULT":1})', ticket: false });
assert.equal(jsonp.completions[1][0], 200);
assert.equal(jsonp.jar.has('AuthTicket'), false);

for (const scenario of [
  { config: {}, reply: { responseURL: 'https://other.example/unexpected' } },
  { config: {}, reply: { ticket: false } },
  { config: { blockCookies: true }, reply: {} },
  { config: { noCookieApi: true }, reply: {} },
]) {
  const failed = createHarness(scenario.config);
  failed.send();
  await failed.reply(scenario.reply);
  assert.equal(failed.completions[0][0], 0);
  assert.equal(failed.completions[0][1], 'error');
  assert.doesNotMatch(
    JSON.stringify(failed.warnings),
    /dummy-password|dummy==/,
  );
}

for (const event of ['error', 'timeout', 'abort']) {
  const failed = createHarness({ embedded: true });
  failed.send();
  await setImmediate();
  failed.requests[0][`on${event}`]();
  await failed.reply();
  assert.equal(failed.completions.length, 1);
  assert.equal(failed.completions[0][1], event);
  assert.equal(failed.writes.length, 0);
}
for (const embedded of [false, true]) {
  const aborted = createHarness({ embedded });
  const transport = aborted.send();
  await setImmediate();
  transport.abort();
  await aborted.reply();
  assert.equal(aborted.completions.length, 0);
  if (embedded) assert.equal(aborted.popups[0].closed, true);
  else assert.equal(aborted.requests[0].aborted, true);
}

const blocked = createHarness({ embedded: true, popupBlocked: true });
blocked.send();
await setImmediate();
assert.equal(blocked.requests.length, 0);
assert.equal(blocked.completions[0][1], 'error');
assert.match(JSON.stringify(blocked.warnings), /팝업/);
assert.equal(blocked.timers.size, 0);

for (const manualClose of [false, true]) {
  const pending = createHarness({ embedded: true });
  pending.send();
  await setImmediate();
  if (manualClose) pending.popups[0].close();
  const timer = [...pending.timers.values()].find(
    (timer) => timer.interval === manualClose,
  );
  timer.fn();
  await pending.reply();
  assert.equal(pending.completions.length, 1);
  assert.equal(pending.completions[0][1], manualClose ? 'abort' : 'timeout');
  assert.equal(pending.timers.size, 0);
}

const spoof = createHarness({ embedded: true, holdRequest: true });
spoof.send();
await setImmediate();
const popup = spoof.popups[0];
const nonce = JSON.parse(
  popup.initialName.slice('soop-multi-view.login:'.length),
).nonce;
const success = {
  nonce,
  phase: 'response',
  response: { status: 200, statusText: 'OK', text: '{}' },
};
spoof.dispatch(spoof.page, success, 'https://evil.example', popup);
spoof.dispatch(spoof.page, success, loginOrigin, {});
spoof.dispatch(
  spoof.page,
  { ...success, nonce: randomUUID() },
  loginOrigin,
  popup,
);
const maliciousRequest = {
  url: 'https://evil.example/steal',
  method: 'POST',
  data: dummyBody,
  headers: {},
  timeout: 0,
};
spoof.dispatch(
  popup,
  { nonce, phase: 'request', request: maliciousRequest },
  spoof.page.location.origin,
  popup.opener,
);
const validMessage = spoof.messages.find(
  (m) => m.data.phase === 'request',
).data;
spoof.dispatch(popup, validMessage, 'https://evil.example', popup.opener);
spoof.dispatch(popup, validMessage, spoof.page.location.origin, {});
spoof.dispatch(
  popup,
  { ...validMessage, nonce: randomUUID() },
  spoof.page.location.origin,
  popup.opener,
);
assert.equal(spoof.requests.length, 0);
assert.equal(spoof.completions.length, 0);
spoof.dispatch(popup, validMessage, spoof.page.location.origin, popup.opener);
assert.equal(spoof.requests.length, 1);
await spoof.reply();
assert.equal(spoof.completions.length, 1);

const late = createHarness({ lateJquery: true });
assert.equal(late.transports.length, 0);
late.installJquery();
late.installJquery();
late.runAgain();
assert.equal(late.transports.length, 1);
console.log('SOOP login userscript checks passed');
