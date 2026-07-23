import { CloseIcon, EyeOffIcon, MaximizeIcon, MinimizeIcon } from './icons';

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
          <EyeOffIcon class="size-3.5" />
        </button>
        <button
          aria-label={`${props.name} 축소`}
          aria-pressed={props.displayState === 'minimized'}
          class={stateButtonClass(props.displayState === 'minimized')}
          onClick={() => props.onDisplayStateChange?.('minimized')}
          title="축소"
          type="button"
        >
          <MinimizeIcon class="size-3.5" />
        </button>
        <button
          aria-label={`${props.name} 확대`}
          aria-pressed={props.displayState === 'maximized'}
          class={stateButtonClass(props.displayState === 'maximized')}
          onClick={() => props.onDisplayStateChange?.('maximized')}
          title="확대"
          type="button"
        >
          <MaximizeIcon class="size-3.5" />
        </button>
      </fieldset>

      <button
        aria-label={`${props.name} 삭제`}
        class="grid w-8 place-items-center rounded-r-lg border-l border-white/10 text-white/35 transition hover:bg-red-500/15 hover:text-red-300 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        onClick={() => props.onDelete?.()}
        title="삭제"
        type="button"
      >
        <CloseIcon class="size-3.5" />
      </button>
    </li>
  );
};

export default MenuItem;
