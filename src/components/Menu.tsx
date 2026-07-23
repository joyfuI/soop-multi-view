import { For } from 'solid-js';

import type { MenuItemDisplayState } from './MenuItem';
import MenuItem from './MenuItem';

export type MenuProps = {
  data: {
    id: string;
    name: string;
    online?: boolean;
    displayState: MenuItemDisplayState;
  }[];
  onAdd?: (id: string) => void;
  onDelete?: (id: string) => void;
  onDisplayStateChange?: (
    id: string,
    displayState: MenuItemDisplayState,
  ) => void;
};

const Menu = (props: MenuProps) => {
  let nameInput!: HTMLInputElement;

  const handleAdd = () => {
    props.onAdd?.(nameInput.value);
    nameInput.value = '';
  };

  const handleDelete = (id: string) => () => props.onDelete?.(id);

  const handleDisplayStateChange =
    (id: string) => (displayState: MenuItemDisplayState) =>
      props.onDisplayStateChange?.(id, displayState);

  const handleMaximizeOnline = () => {
    for (const item of props.data) {
      if (item.online) {
        props.onDisplayStateChange?.(item.id, 'maximized');
      }
    }
  };

  const handleHideOffline = () => {
    for (const item of props.data) {
      if (!item.online) {
        props.onDisplayStateChange?.(item.id, 'hidden');
      }
    }
  };

  return (
    <nav>
      <details class="group">
        <summary
          aria-label="메뉴 열기"
          class="fixed top-3 left-3 z-50 grid size-10 cursor-pointer list-none place-items-center rounded-xl border border-white/15 bg-neutral-950/40 text-white shadow-lg shadow-black/10 transition hover:bg-neutral-950/55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/80"
        >
          <svg
            aria-hidden="true"
            class="size-5 group-open:hidden"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              d="M5 7.5h14M5 12h14M5 16.5h14"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-width="1.8"
            />
          </svg>
          <svg
            aria-hidden="true"
            class="hidden size-5 group-open:block"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              d="m7 7 10 10M17 7 7 17"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-width="1.8"
            />
          </svg>
        </summary>

        <div class="fixed top-3 right-3 left-15 z-40 flex max-h-[calc(100dvh-1.5rem)] flex-col gap-2 overflow-hidden rounded-2xl border border-white/15 bg-neutral-950/75 p-2 text-white shadow-2xl shadow-black/25 backdrop-blur-lg md:flex-row md:items-center">
          <fieldset class="m-0 flex shrink-0 items-center gap-1.5 border-0 border-b border-white/10 p-0 pb-2 md:border-r md:border-b-0 md:pr-2 md:pb-0">
            <legend class="sr-only">플레이어 일괄 제어</legend>
            <button
              aria-label="온라인 플레이어 모두 확대"
              class="relative grid size-8 shrink-0 place-items-center rounded-lg text-white/65 transition hover:bg-emerald-400/15 hover:text-emerald-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-white/65"
              disabled={!props.data.some((item) => item.online)}
              onClick={handleMaximizeOnline}
              title="온라인 플레이어 모두 확대"
              type="button"
            >
              <svg
                aria-hidden="true"
                class="size-4"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.8"
                />
              </svg>
              <span class="absolute right-1 bottom-1 size-1.5 rounded-full bg-emerald-400 ring-2 ring-neutral-950/80" />
            </button>

            <button
              aria-label="오프라인 플레이어 모두 숨기기"
              class="relative grid size-8 shrink-0 place-items-center rounded-lg text-white/45 transition hover:bg-white/10 hover:text-white/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-white/45"
              disabled={!props.data.some((item) => !item.online)}
              onClick={handleHideOffline}
              title="오프라인 플레이어 모두 숨기기"
              type="button"
            >
              <svg
                aria-hidden="true"
                class="size-4"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  d="m3 3 18 18M10.7 10.7a2 2 0 0 0 2.6 2.6M9.9 4.2A9.7 9.7 0 0 1 12 4c4.8 0 8 4.3 9 8a13 13 0 0 1-1.3 2.8M6.6 6.6A12 12 0 0 0 3 12c1 3.7 4.2 8 9 8a9 9 0 0 0 3.3-.6"
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.8"
                />
              </svg>
              <span class="absolute right-1 bottom-1 size-1.5 rounded-full bg-white/35 ring-2 ring-neutral-950/80" />
            </button>
          </fieldset>

          <ul class="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto [scrollbar-color:rgba(255,255,255,0.25)_transparent] scrollbar-thin">
            <For each={props.data}>
              {(item) => (
                <MenuItem
                  displayState={item.displayState}
                  name={item.name}
                  onDelete={handleDelete(item.id)}
                  onDisplayStateChange={handleDisplayStateChange(item.id)}
                  online={item.online}
                />
              )}
            </For>
          </ul>

          <div class="flex shrink-0 items-center gap-1.5 border-t border-white/10 pt-2 md:border-t-0 md:border-l md:pt-0 md:pl-2">
            <label class="sr-only" for="view-name">
              SOOP ID
            </label>
            <input
              class="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/8 px-3 py-1.5 text-sm text-white transition outline-none focus:ring-2 focus:ring-white/10 md:w-32 md:flex-none"
              id="view-name"
              placeholder="SOOP ID"
              ref={nameInput}
              type="text"
            />
            <button
              aria-label="추가"
              class="grid size-8 shrink-0 place-items-center rounded-lg bg-white text-neutral-950 transition hover:bg-emerald-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-95"
              onClick={handleAdd}
              title="추가"
              type="button"
            >
              <svg
                aria-hidden="true"
                class="size-4"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  d="M12 5v14M5 12h14"
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-width="2"
                />
              </svg>
            </button>
          </div>
        </div>
      </details>
    </nav>
  );
};

export default Menu;
