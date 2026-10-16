// ==UserScript==
// @name         SOOP 멀티뷰 로그인 보정
// @namespace    https://soop-multi-view.netlify.app/
// @version      1
// @author       joyfuI
// @description  크로미움 계열 브라우저의 멀티뷰 내 SOOP 로그인 문제를 해결하고 화질 선택 메뉴를 표시합니다.
// @homepageURL  https://gist.github.com/joyfuI/9fe4a6f6ab6d70dc522c99042c5d0734
// @downloadURL  https://gist.github.com/joyfuI/9fe4a6f6ab6d70dc522c99042c5d0734/raw/soop-login-fix.user.js
// @updateURL    https://gist.github.com/joyfuI/9fe4a6f6ab6d70dc522c99042c5d0734/raw/soop-login-fix.user.js
// @match        https://www.sooplive.com/*
// @match        https://play.sooplive.com/*
// @match        https://login.sooplive.com/*
// @match        https://soop-multi-view.netlify.app/*
// @run-at       document-start
// @grant        unsafeWindow
// ==/UserScript==

(() => {
  // biome-ignore lint/suspicious/noRedundantUseStrict: 유저스크립트는 classic script로 실행된다.
  'use strict';

  const page = typeof unsafeWindow === 'undefined' ? window : unsafeWindow;
  const appOrigin = 'https://soop-multi-view.netlify.app';
  const appPage = page.location.origin === appOrigin;
  if (
    !appPage &&
    ![
      'https://www.sooplive.com',
      'https://play.sooplive.com',
      'https://login.sooplive.com',
    ].includes(page.location.origin)
  )
    return;
  const marker = Symbol.for('soop-multi-view.login-fix');
  if (page[marker]) return;
  page[marker] = true;

  if (appPage) {
    page.addEventListener('message', (event) => {
      if (
        event.source !== page ||
        event.origin !== appOrigin ||
        event.data?.type !== 'soop-multi-view:userscript-check' ||
        typeof event.data.nonce !== 'string' ||
        !/^[a-f\d-]{36}$/.test(event.data.nonce)
      )
        return;
      page.postMessage(
        {
          type: 'soop-multi-view:userscript-ready',
          nonce: event.data.nonce,
          version: 1,
        },
        event.origin,
      );
    });
    return;
  }

  const loginOrigin = 'https://login.sooplive.com';
  const helperPrefix = 'soop-multi-view.login:';
  const cookieNames = new Set([
    'AuthTicket',
    'BbsTicket',
    'UserTicket',
    'isBbs',
    'RDB',
  ]);
  const authUrl = (value) => {
    try {
      const url = new URL(value, page.location.href);
      if (
        url.origin === loginOrigin &&
        !url.username &&
        !url.password &&
        ['/app/LoginAction.php', '/app/LogOut.php'].includes(url.pathname)
      ) {
        return url;
      }
    } catch {
      // 인증 요청 이외의 URL은 기존 SOOP 처리에 맡긴다.
    }
  };
  const warn = (reason) => {
    const messages = {
      'popup-blocked':
        'SOOP 인증 처리 창이 차단됐습니다. 멀티뷰의 팝업을 허용한 뒤 다시 로그인해 주세요.',
      timeout:
        'SOOP 인증 처리가 지연됐습니다. 인증 처리 창에서도 유저스크립트가 실행되는지 확인해 주세요.',
      'cookie-api': '이 브라우저에서 Cookie Store API를 사용할 수 없습니다.',
      'cookie-repair':
        '인증 쿠키를 보정하지 못했습니다. SOOP의 쿠키 허용 여부를 확인해 주세요.',
      'cookie-missing':
        '로그인 응답은 성공했지만 인증 쿠키를 사용할 수 없습니다. 타사 쿠키 허용 여부를 확인해 주세요.',
      redirect: '인증 응답의 주소가 예상한 SOOP 주소와 다릅니다.',
    };
    console.warn(
      `[SOOP 로그인 보정] ${messages[reason] || '인증 요청을 처리하지 못했습니다.'}`,
    );
  };
  const repairCookies = async (requireTicket = false) => {
    if (!page.cookieStore) throw new Error('cookie-api');
    try {
      for (const cookie of await page.cookieStore.getAll()) {
        if (
          cookieNames.has(cookie.name) &&
          cookie.domain?.replace(/^\./, '') === 'sooplive.com' &&
          (cookie.sameSite !== 'none' || !cookie.secure)
        ) {
          // Cookie Store API는 Secure를 적용하며 기존 만료일과 범위를 보존한다.
          await page.cookieStore.set({ ...cookie, sameSite: 'none' });
        }
      }
    } catch {
      throw new Error('cookie-repair');
    }
    if (requireTicket) {
      const cookies = await page.cookieStore.getAll();
      if (
        !cookies.some(
          (cookie) =>
            cookie.name === 'AuthTicket' &&
            cookie.value &&
            cookie.domain?.replace(/^\./, '') === 'sooplive.com' &&
            cookie.sameSite === 'none' &&
            cookie.secure,
        )
      ) {
        throw new Error('cookie-missing');
      }
    }
  };

  const sendNative = (request, complete) => {
    const xhr = new page.XMLHttpRequest();
    let stopped = false;
    const finish = (response) => {
      if (stopped) return;
      stopped = true;
      complete(response);
    };
    xhr.onload = async () => {
      if (stopped) return;
      try {
        if (!authUrl(xhr.responseURL)) throw new Error('redirect');
        let result;
        try {
          const text = xhr.responseText;
          result = JSON.parse(
            text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1),
          ).RESULT;
        } catch {
          // JSONP 변환은 원래 SOOP 창의 jQuery converter에 맡긴다.
        }
        await repairCookies(
          result === 1 &&
            new URL(request.url).pathname === '/app/LoginAction.php',
        );
        finish({
          status: xhr.status,
          statusText: xhr.statusText,
          text: xhr.responseText,
          headers: xhr.getAllResponseHeaders(),
        });
      } catch (error) {
        finish({ status: 0, statusText: 'error', reason: error.message });
      }
    };
    for (const event of ['error', 'timeout', 'abort']) {
      xhr[`on${event}`] = () => finish({ status: 0, statusText: event });
    }
    try {
      xhr.open(request.method, request.url, true);
      xhr.withCredentials = true;
      xhr.timeout = request.timeout;
      for (const [name, value] of Object.entries(request.headers))
        xhr.setRequestHeader(name, value);
      xhr.send(request.data);
    } catch {
      finish({ status: 0, statusText: 'error' });
    }
    return () => {
      stopped = true;
      xhr.abort();
    };
  };

  let helper;
  try {
    if (
      page.top === page &&
      page.location.origin === loginOrigin &&
      page.name.startsWith(helperPrefix)
    ) {
      helper = JSON.parse(page.name.slice(helperPrefix.length));
      const origin = new URL(helper.origin);
      if (
        !page.opener ||
        origin.origin !== helper.origin ||
        origin.protocol !== 'https:' ||
        !origin.hostname.endsWith('.sooplive.com') ||
        !/^[a-f\d-]{36}$/.test(helper.nonce)
      )
        helper = undefined;
    }
  } catch {
    helper = undefined;
  }
  if (helper) {
    // 인증 정보는 URL·창 이름·저장소에 넣지 않고 SOOP 창 사이에서만 전달한다.
    page.name = '';
    const receive = (event) => {
      const data = event.data;
      if (
        event.source !== page.opener ||
        event.origin !== helper.origin ||
        data?.nonce !== helper.nonce ||
        data.phase !== 'request'
      )
        return;
      const request = data.request;
      if (
        !request ||
        !authUrl(request.url) ||
        !['GET', 'POST'].includes(request.method) ||
        (request.data != null && typeof request.data !== 'string') ||
        !request.headers ||
        typeof request.headers !== 'object'
      )
        return;
      page.removeEventListener('message', receive);
      sendNative(request, (response) =>
        page.opener.postMessage(
          { nonce: helper.nonce, phase: 'response', response },
          helper.origin,
        ),
      );
    };
    page.addEventListener('message', receive);
    page.opener.postMessage(
      { nonce: helper.nonce, phase: 'ready' },
      helper.origin,
    );
    return;
  }

  const sendPopup = (request, complete) => {
    const nonce = page.crypto.randomUUID();
    let popup;
    let timer;
    let poll;
    let stopped = false;
    let sent = false;
    const cleanup = () => {
      stopped = true;
      page.removeEventListener('message', receive);
      page.clearTimeout(timer);
      page.clearInterval(poll);
      popup?.close();
    };
    const finish = (response) => {
      if (stopped) return;
      cleanup();
      complete(response);
    };
    const receive = (event) => {
      const data = event.data;
      if (
        event.source !== popup ||
        event.origin !== loginOrigin ||
        data?.nonce !== nonce
      )
        return;
      if (data.phase === 'ready' && !sent) {
        sent = true;
        popup.postMessage({ nonce, phase: 'request', request }, loginOrigin);
      } else if (data.phase === 'response' && sent && data.response) {
        finish(data.response);
      }
    };
    page.addEventListener('message', receive);
    try {
      popup = page.open(
        `${loginOrigin}/afreeca/login.php`,
        helperPrefix + JSON.stringify({ nonce, origin: page.location.origin }),
        'popup,width=480,height=500',
      );
    } catch {
      // 팝업이 차단되면 입력 정보를 기존 타사 요청으로 재전송하지 않는다.
    }
    if (!popup) {
      finish({ status: 0, statusText: 'error', reason: 'popup-blocked' });
    } else {
      timer = page.setTimeout(
        () => finish({ status: 0, statusText: 'timeout', reason: 'timeout' }),
        request.timeout || 30000,
      );
      poll = page.setInterval(() => {
        if (popup.closed) finish({ status: 0, statusText: 'abort' });
      }, 250);
    }
    return cleanup;
  };

  const document = page.document;
  if (page.location.origin === 'https://play.sooplive.com') {
    const showQualityMenu = () => {
      const style = document.createElement('style');
      style.textContent =
        '.embeded_mode #webplayer #player .right_ctrl .quality_box { display: block !important; }';
      document.documentElement.append(style);
    };
    if (document.documentElement) showQualityMenu();
    else
      document.addEventListener('DOMContentLoaded', showQualityMenu, {
        once: true,
      });
  }
  let transportInstalled = false;
  const installEvents = [
    'DOMContentLoaded',
    'pointerdown',
    'keydown',
    'focusin',
  ];
  const installTransport = () => {
    if (transportInstalled || !page.jQuery?.ajaxTransport) return;
    transportInstalled = true;
    for (const event of installEvents)
      document.removeEventListener(event, installTransport, true);
    // shortcut: SOOP의 jQuery 인증 요청에 연결한다. 로그인 구현이 바뀌면 재검증한다.
    page.jQuery.ajaxTransport('+* +script', (options) => {
      const url = authUrl(options.url);
      if (!url || options.async === false) return;
      let abort;
      return {
        send(headers, complete) {
          const request = {
            url: url.href,
            method: options.type,
            headers,
            data: options.hasContent ? options.data : null,
            timeout: options.timeout || 0,
          };
          const send = page.top === page ? sendNative : sendPopup;
          abort = send(request, (response) => {
            if (response.reason) warn(response.reason);
            complete(
              response.status,
              response.statusText,
              { text: response.text || '' },
              response.headers || '',
            );
          });
        },
        abort() {
          abort?.();
        },
      };
    });
  };
  for (const event of installEvents)
    document.addEventListener(event, installTransport, true);
  installTransport();
  repairCookies().catch((error) => warn(error.message));
})();
