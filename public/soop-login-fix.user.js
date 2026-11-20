// ==UserScript==
// @name         SOOP 멀티뷰 로그인 보정
// @namespace    https://soop-multi-view.netlify.app/
// @version      2
// @author       joyfuI
// @description  크로미움 계열 브라우저의 멀티뷰 내 SOOP 로그인 문제를 해결하고, 화질 선택, 시차 단축, 타임머신 등을 복구합니다.
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
          version: 2,
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

  const repairTimeShiftCookies = (timeShift, info) => {
    const manager = timeShift?.controller?.streamer?.signedCookieManager;
    if (!manager || page.top === page || !page.cookieStore) return;
    const type = Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(manager),
      'type',
    );
    if (!type?.get || !type.set) return;

    Object.defineProperty(manager, 'type', {
      configurable: true,
      get: type.get,
      set(value) {
        type.set.call(this, value);
        const auth = this.broadAuth;
        const request = auth?.params;
        if (
          auth?.API_URL !== 'https://live.sooplive.com/api/private_auth.php' ||
          ![
            'official_timeshift',
            'official_timeshift_free',
            'sub_timeshift',
          ].includes(request?.type) ||
          typeof auth.setSignedCookie !== 'function'
        )
          return;

        const setSignedCookie = auth.setSignedCookie;
        auth.setSignedCookie = async function (...args) {
          const response = await setSignedCookie.apply(this, args);
          const signed = response?.data?.signed_cookie;
          if (response?.result !== 1 || typeof signed !== 'string')
            return response;
          try {
            const archive = new URL(request.url);
            const path = `/${request.broad_no}/`;
            if (
              !/^\/\d+\/$/.test(path) ||
              archive.protocol !== 'https:' ||
              !/^live-tm-[a-z0-9-]+\.sooplive\.com$/.test(archive.hostname) ||
              archive.username ||
              archive.password ||
              archive.port ||
              !archive.pathname.startsWith(path) ||
              !archive.pathname.endsWith('.m3u8')
            )
              return response;

            const cookies = new Map();
            for (const pair of signed.split(';')) {
              if (!pair.trim()) continue;
              const match =
                /^(CloudFront-(?:Signature|Key-Pair-Id|Policy))=([A-Za-z0-9_~-]+)$/.exec(
                  pair.trim(),
                );
              if (!match || cookies.has(match[1])) return response;
              cookies.set(match[1], match[2]);
            }
            if (cookies.size !== 3) return response;
            const policy = cookies
              .get('CloudFront-Policy')
              .replaceAll('-', '+')
              .replaceAll('~', '/')
              .replaceAll('_', '=');
            const { Statement: statements } = JSON.parse(page.atob(policy));
            const statement = statements?.[0];
            const expiry =
              statement?.Condition?.DateLessThan?.['AWS:EpochTime'];
            if (
              !Array.isArray(statements) ||
              statements.length !== 1 ||
              statement?.Resource !== `${archive.origin}${path}*` ||
              !Number.isSafeInteger(expiry)
            )
              return response;
            const expires = expiry * 1000;

            const storeCookies = async () => {
              if (
                !timeShift.canUserUseTimeShift ||
                request.url !== info.szTimeShiftUrl ||
                request.broad_no !== info.nBroadNo ||
                expires <= Date.now()
              )
                return;
              // 재생목록 요청 전에 같은 방송의 서명 세 개를 모두 저장한다.
              const results = await Promise.allSettled(
                [...cookies].map(([name, value]) =>
                  page.cookieStore.set({
                    name,
                    value,
                    expires,
                    path,
                    domain: 'sooplive.com',
                    sameSite: 'none',
                    partitioned: true,
                  }),
                ),
              );
              if (results.some((result) => result.status === 'rejected'))
                throw new Error('cookie-repair');
            };
            const locks = page.navigator?.locks;
            if (locks)
              await locks.request(
                `soop-multi-view:timeshift:${path}`,
                storeCookies,
              );
            else await storeCookies();
          } catch {
            console.warn(
              '[SOOP 타임시프트 보정] 서명 쿠키를 저장하지 못했습니다.',
            );
          }
          return response;
        };
      },
    });
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
    const restorePlayerControls = () => {
      const style = document.createElement('style');
      style.textContent = `
        .embeded_mode #webplayer #player .right_ctrl .quality_box { display: block !important; }
        .embeded_mode #webplayer #player:not(.current_blind) .right_ctrl .btn_pip_mode:not([hidden], [style*="display: none"], [style*="display:none"]) {
          display: inline-block !important;
        }
        .embeded_mode #player .quality_box #clear_screen {
          display: block;
          position: absolute;
          width: 1px;
          height: 1px;
          clip-path: inset(50%);
        }
        .embeded_mode #player .quality_box #clear_screen:focus-visible + span {
          outline: 2px solid white;
          outline-offset: 2px;
        }`;
      document.documentElement.append(style);
    };
    if (document.documentElement) restorePlayerControls();
    else
      document.addEventListener('DOMContentLoaded', restorePlayerControls, {
        once: true,
      });

    if (/\/(?:direct|embed)\/?$/.test(page.location.pathname)) {
      // SOOP은 초기화 직후 PonReady를 보내므로 객체가 할당되는 시점에 연결한다.
      const onPlayerReady = (name, install) => {
        const apply = (value) => {
          const warnRestore = (error) =>
            console.warn('[SOOP 플레이어 복구]', error);
          try {
            install(value)?.catch(warnRestore);
          } catch (error) {
            warnRestore(error);
          }
        };
        if (page[name]) return apply(page[name]);
        const previous = Object.getOwnPropertyDescriptor(page, name);
        if (previous && (!previous.configurable || !previous.writable)) return;
        let value = previous?.value;
        Object.defineProperty(page, name, {
          configurable: true,
          enumerable: previous?.enumerable ?? true,
          get: () => value,
          set(next) {
            value = next;
            if (!next) return;
            Object.defineProperty(page, name, {
              configurable: true,
              enumerable: previous?.enumerable ?? true,
              writable: true,
              value: next,
            });
            apply(next);
          },
        });
      };

      onPlayerReady('livePlayer', (player) => {
        const info = player.externalInterface?.getPlayerInfo?.();
        if (!info?.isEmbed) return;

        const supportsLowLatency = info.isSupportLowLatencyMode;
        if (typeof supportsLowLatency === 'function') {
          const playbackInfo = Object.create(info, {
            isEmbed: { value: false },
          });
          info.isSupportLowLatencyMode = (...args) =>
            supportsLowLatency.apply(playbackInfo, args);
        }

        const timeShift = player.timeShift;
        const isTimeShiftShow = timeShift?.isTimeShiftShow;
        if (typeof isTimeShiftShow === 'function') {
          timeShift.isTimeShiftShow = function (...args) {
            return (
              this.canUserUseTimeShift && isTimeShiftShow.apply(this, args)
            );
          };
        }
        repairTimeShiftCookies(timeShift, info);
        const setTimeShiftInfo = timeShift?.setTimeShiftInfo;
        const embed = Object.getOwnPropertyDescriptor(info, 'isEmbed');
        if (
          typeof setTimeShiftInfo !== 'function' ||
          !embed?.configurable ||
          !embed.get
        )
          return;
        timeShift.setTimeShiftInfo = function (...args) {
          if (!info.isEmbed || !info.szTimeShiftUrl)
            return setTimeShiftInfo.apply(this, args);
          // 두 동기 초기화 검사 동안만 적용하고 SOOP의 권한·쿠키 처리는 그대로 호출한다.
          Object.defineProperty(info, 'isEmbed', {
            ...embed,
            get: () => false,
          });
          try {
            return setTimeShiftInfo.apply(this, args);
          } finally {
            Object.defineProperty(info, 'isEmbed', embed);
          }
        };
      });

      onPlayerReady('liveView', async (view) => {
        await view.isLoaded?.();
        const video = view.controller?.getContainer?.('VideoContainer');
        const changeInfo = video?.change_info;
        const clearScreen = document.getElementById('clear_screen');
        const info = view.LiveViewInfo;
        const embed = info && Object.getOwnPropertyDescriptor(info, 'bEmbed');
        if (
          typeof changeInfo !== 'function' ||
          !clearScreen ||
          !embed?.configurable ||
          !embed.get ||
          typeof page.jQuery !== 'function'
        )
          return;
        const control = page.jQuery(clearScreen);
        if (typeof control.triggerHandler !== 'function') return;

        // SOOP의 기존 초기화·클릭 처리에서 저장값과 필터를 함께 관리한다.
        const withClearMode = (run) => {
          if (!info.bEmbed) return run();
          Object.defineProperty(info, 'bEmbed', { ...embed, get: () => false });
          try {
            return run();
          } finally {
            Object.defineProperty(info, 'bEmbed', embed);
          }
        };
        video.change_info = function (...args) {
          return withClearMode(() => changeInfo.apply(this, args));
        };
        clearScreen.addEventListener(
          'click',
          (event) => {
            if (!info.bEmbed) return;
            event.stopImmediatePropagation();
            withClearMode(() => control.triggerHandler('click'));
          },
          true,
        );
      });
    }
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
