export type UserscriptStatus = 'checking' | 'missing' | 'outdated' | 'active';

const MIN_VERSION = 2;

export const getBrowserFamily = (browser: {
  userAgent: string;
  userAgentData?: { brands: readonly { brand: string }[] };
}) => {
  if (browser.userAgentData?.brands.some(({ brand }) => brand === 'Chromium'))
    return 'chromium';
  if (/\bFirefox\//.test(browser.userAgent)) return 'firefox';
  if (/\b(?:Chrome|Chromium|Edg|OPR)\//.test(browser.userAgent))
    return 'chromium';
  return 'other';
};

export const createUserscriptCheck = (
  onStatus: (status: UserscriptStatus) => void,
) => {
  let nonce: string | undefined;
  let hasOutdatedVersion = false;
  let timer: number | undefined;
  let retried = false;
  let active = false;

  const clearTimer = () => {
    window.clearTimeout(timer);
    timer = undefined;
  };
  const send = () => {
    window.postMessage(
      { type: 'soop-multi-view:userscript-check', nonce },
      window.location.origin,
    );
  };
  const waitForResponse = () => {
    timer = window.setTimeout(() => {
      timer = undefined;
      if (!retried) {
        retried = true;
        send();
        waitForResponse();
      } else {
        onStatus(hasOutdatedVersion ? 'outdated' : 'missing');
      }
    }, 3000);
  };

  return {
    checkPage() {
      if (active) return;
      clearTimer();
      nonce = crypto.randomUUID();
      hasOutdatedVersion = false;
      retried = false;
      onStatus('checking');
      send();
      waitForResponse();
    },
    receive(event: MessageEvent) {
      const data = event.data;
      if (
        active ||
        nonce === undefined ||
        event.source !== window ||
        event.origin !== window.location.origin ||
        data?.type !== 'soop-multi-view:userscript-ready' ||
        data.nonce !== nonce ||
        !Number.isSafeInteger(data.version) ||
        data.version < 1
      )
        return;
      if (data.version >= MIN_VERSION) {
        active = true;
        clearTimer();
        onStatus('active');
      } else if (!hasOutdatedVersion) {
        hasOutdatedVersion = true;
        if (timer === undefined) onStatus('outdated');
      }
    },
    dispose() {
      clearTimer();
      nonce = undefined;
    },
  };
};
