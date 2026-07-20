export type MenuItemDisplayState = 'hidden' | 'minimized' | 'maximized';

export type MenuItemProps = {
  name: string;
  displayState: MenuItemDisplayState;
  online?: boolean;
  onDelete?: () => void;
  onDisplayStateChange?: (displayState: MenuItemDisplayState) => void;
};

const stateButtonClass = (isSelected: boolean) =>
  `grid size-7 place-items-center rounded-lg transition focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
    isSelected
      ? 'bg-white/15 text-white ring-1 ring-inset ring-white/10 hover:bg-white/20'
      : 'text-white/35 hover:bg-white/10 hover:text-white/75'
  }`;

const MenuItem = (props: MenuItemProps) => {
  return (
    <li class="flex shrink-0 items-stretch rounded-lg bg-white/8 text-white/65 ring-1 ring-inset ring-white/12">
      <span class="flex items-center gap-1.5 py-1.5 pr-2.5 pl-3 text-sm font-medium">
        <span
          class={
            props.online
              ? 'size-2 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.15)]'
              : 'size-2 rounded-full bg-white/25'
          }
        />
        {props.name}
      </span>

      <fieldset class="m-0 flex min-w-0 items-center gap-0.5 border-0 border-l border-white/10 p-0 px-0.5">
        <legend class="sr-only">{props.name} 화면</legend>
        <button
          aria-label={`${props.name} 숨기기`}
          aria-pressed={props.displayState === 'hidden'}
          class={stateButtonClass(props.displayState === 'hidden')}
          onClick={() => props.onDisplayStateChange?.('hidden')}
          title="숨기기"
          type="button"
        >
          <svg
            aria-hidden="true"
            class="size-3.5"
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
        </button>
        <button
          aria-label={`${props.name} 축소`}
          aria-pressed={props.displayState === 'minimized'}
          class={stateButtonClass(props.displayState === 'minimized')}
          onClick={() => props.onDisplayStateChange?.('minimized')}
          title="축소"
          type="button"
        >
          <svg
            aria-hidden="true"
            class="size-3.5"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              d="M4 14h6v6M20 10h-6V4"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.8"
            />
          </svg>
        </button>
        <button
          aria-label={`${props.name} 확대`}
          aria-pressed={props.displayState === 'maximized'}
          class={stateButtonClass(props.displayState === 'maximized')}
          onClick={() => props.onDisplayStateChange?.('maximized')}
          title="확대"
          type="button"
        >
          <svg
            aria-hidden="true"
            class="size-3.5"
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
        </button>
      </fieldset>

      <button
        aria-label={`${props.name} 삭제`}
        class="grid w-8 place-items-center rounded-r-lg border-l border-white/10 text-white/35 transition hover:bg-red-500/15 hover:text-red-300 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        onClick={() => props.onDelete?.()}
        title="삭제"
        type="button"
      >
        <svg
          aria-hidden="true"
          class="size-3.5"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            d="m8 8 8 8m0-8-8 8"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-width="2"
          />
        </svg>
      </button>
    </li>
  );
};

export default MenuItem;
