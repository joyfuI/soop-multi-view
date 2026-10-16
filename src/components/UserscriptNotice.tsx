import { Show } from 'solid-js';

import type { UserscriptStatus } from '../helper/userscript';
import { CloseIcon } from './icons';

type UserscriptNoticeProps = {
  status: UserscriptStatus;
  chromium: boolean;
  empty: boolean;
  onClose: () => void;
};

const UserscriptNotice = (props: UserscriptNoticeProps) => {
  const title = () => {
    if (props.status === 'active') return '유저 스크립트가 실행 중이에요';
    if (props.status === 'checking') return '유저 스크립트 설치 안내';
    if (props.status === 'outdated') return '유저 스크립트 업데이트가 필요해요';
    return props.chromium
      ? '이 브라우저에서는 멀티뷰 로그인이 제한될 수 있어요'
      : '화질 선택 메뉴를 사용해 보세요';
  };

  return (
    <aside
      aria-label="유저 스크립트 안내"
      class={`max-h-[50dvh] shrink-0 overflow-y-auto rounded-xl border border-white/15 bg-neutral-900 p-4 text-white shadow-lg ${
        props.empty
          ? 'fixed top-1/2 left-1/2 z-10 w-[calc(100%-1.5rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2'
          : 'relative mt-3 mr-3 mb-3 ml-15'
      }`}
    >
      <div
        class="flex flex-col gap-4 md:flex-row"
        classList={{ 'pr-8': !props.empty }}
      >
        <div class="min-w-0 md:flex-1" role="status">
          <p class="m-0 text-sm font-medium">{title()}</p>
          <Show when={props.status !== 'active'}>
            <p class="mt-1 mb-0 text-xs leading-relaxed text-white/65">
              {props.chromium
                ? '로그인 문제 해결과 화질 선택을 위해 유저 스크립트의 설치 상태를 확인해 주세요.'
                : '유저 스크립트를 설치하면 숨겨진 화질 선택 메뉴를 사용할 수 있어요.'}
            </p>
          </Show>
          <p class="mt-2 mb-0 text-xs text-white/80">
            유저 스크립트:{' '}
            {
              {
                checking: '확인 중',
                missing: '감지되지 않음',
                outdated: '업데이트 필요',
                active: '감지됨',
              }[props.status]
            }
          </p>
        </div>
        <div
          class="min-w-0 border-t border-white/10 pt-4 text-xs leading-relaxed text-white/65 md:flex-1 md:border-t-0 md:border-l md:pt-0 md:pl-4"
          id="userscript-install-guide"
        >
          <ol class="m-0 list-decimal space-y-1 pl-5">
            <li>
              <a
                class="text-white underline underline-offset-4 hover:text-white/80"
                href="https://www.tampermonkey.net/"
                rel="noreferrer"
                target="_blank"
              >
                Tampermonkey
              </a>
              ,{' '}
              <a
                class="text-white underline underline-offset-4 hover:text-white/80"
                href="https://violentmonkey.github.io/"
                rel="noreferrer"
                target="_blank"
              >
                Violentmonkey
              </a>{' '}
              또는{' '}
              <a
                class="text-white underline underline-offset-4 hover:text-white/80"
                href="https://www.greasespot.net/"
                rel="noreferrer"
                target="_blank"
              >
                Greasemonkey
              </a>
              를 준비해 주세요.
            </li>
            <li>
              <a
                class="text-white underline underline-offset-4 hover:text-white/80"
                href="https://gist.github.com/joyfuI/9fe4a6f6ab6d70dc522c99042c5d0734/raw/soop-login-fix.user.js"
                rel="noreferrer"
                target="_blank"
              >
                유저 스크립트 설치
              </a>
              를 눌러 설치하거나 업데이트해 주세요.
            </li>
            <li>설치 후 이 페이지를 새로고침해 주세요.</li>
          </ol>
        </div>
      </div>
      <Show when={!props.empty}>
        <button
          aria-label="안내 닫고 다시 보지 않기"
          class="absolute top-2 right-2 grid size-9 place-items-center rounded-lg text-white/50 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          onClick={props.onClose}
          type="button"
        >
          <CloseIcon class="size-4" />
        </button>
      </Show>
    </aside>
  );
};

export default UserscriptNotice;
