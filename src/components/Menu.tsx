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
