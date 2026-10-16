import { createEffect, createSignal, onCleanup } from 'solid-js';

import {
  ChatIcon,
  MaximizeIcon,
  MinimizeIcon,
  RefreshIcon,
} from './components/icons';
import type { MenuItemDisplayState } from './components/MenuItem';
import { PLAYER_CHAT_WIDTH } from './helper/playerGrid';

export type PlayerLayout = {
  height: number;
  width: number;
  x: number;
  y: number;
};

export type PlayerProps = {
  ref: (element: HTMLIFrameElement | undefined) => void;
  id: string;
  displayState: MenuItemDisplayState;
  layout?: PlayerLayout;
  onChatVisibilityChange?: (visible: boolean) => void;
  onDisplayStateChange?: (displayState: MenuItemDisplayState) => void;
};

const Player = (props: PlayerProps) => {
  let iframe: HTMLIFrameElement | undefined;

  const [isChatVisible, setIsChatVisible] = createSignal(
    props.displayState !== 'minimized',
  );
  let previousDisplayState = props.displayState;

  const handleRefresh = () => {
    if (iframe) {
      iframe.setAttribute('src', iframe.src);
    }
  };

  const updateChatVisibility = (visible: boolean) => {
    if (isChatVisible() === visible) {
      return false;
    }

    setIsChatVisible(visible);
    props.onChatVisibilityChange?.(visible);
    return true;
  };

  const handleChat = () => {
    updateChatVisibility(!isChatVisible());
  };

  const handleDisplayStateChange = () => {
    props.onDisplayStateChange?.(
      props.displayState === 'maximized' ? 'minimized' : 'maximized',
    );
  };

  createEffect(() => {
    const displayState = props.displayState;
    const wasMinimized = previousDisplayState === 'minimized';

    previousDisplayState = displayState;

    if (displayState === 'minimized') {
      updateChatVisibility(false);
    } else if (displayState === 'maximized' && wasMinimized) {
      updateChatVisibility(true);
    }
  });

  onCleanup(() => {
    props.ref(undefined);
  });

  return (
    <div
      class="group absolute top-0 left-0 overflow-hidden bg-black"
      data-chat-visible={isChatVisible()}
      data-display-state={props.displayState}
      data-player-id={props.id}
      style={{
        height: props.layout ? `${props.layout.height}px` : '56.25vw',
        'pointer-events': props.displayState === 'hidden' ? 'none' : 'auto',
        transform: props.layout
          ? `translate3d(${props.layout.x}px, ${props.layout.y}px, 0)`
          : 'translate3d(0, 0, 0)',
        visibility: props.displayState === 'hidden' ? 'hidden' : 'visible',
        width: props.layout ? `${props.layout.width}px` : '100vw',
      }}
    >
      <iframe
        allow="autoplay; fullscreen; encrypted-media; local-network-access; loopback-network"
        allowfullscreen
        class="border-0"
        name={`${props.id}`}
        ref={(element) => {
          iframe = element;
          props.ref(element);
        }}
        src={`https://play.sooplive.com/${encodeURIComponent(props.id)}/direct?fromApi=1`}
        style={{
          height: '100%',
          width: isChatVisible()
            ? '100%'
            : `calc(100% + ${PLAYER_CHAT_WIDTH}px)`,
        }}
        title={`${props.id}`}
      />

      <div
        class="pointer-events-none absolute top-3 z-10 flex gap-1.5 opacity-0 transition-[right,opacity] duration-150 group-hover:opacity-100"
        style={{
          right: isChatVisible()
            ? `calc(${PLAYER_CHAT_WIDTH}px + 0.75rem)`
            : '0.75rem',
        }}
      >
        <button
          aria-label={`${props.id} 새로고침`}
          class="pointer-events-auto grid size-9 place-items-center rounded-full bg-black/65 text-white/80 shadow-lg ring-1 ring-white/15 backdrop-blur-sm transition hover:bg-black/85 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          onClick={handleRefresh}
          title="새로고침"
          type="button"
        >
          <RefreshIcon class="size-4.5" />
        </button>

        <button
          aria-label={`${props.id} ${
            props.displayState === 'maximized' ? '축소' : '확대'
          }`}
          class="pointer-events-auto grid size-9 place-items-center rounded-full bg-black/65 text-white/80 shadow-lg ring-1 ring-white/15 backdrop-blur-sm transition hover:bg-black/85 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          onClick={handleDisplayStateChange}
          title={props.displayState === 'maximized' ? '축소' : '확대'}
          type="button"
        >
          {props.displayState === 'maximized' ? (
            <MinimizeIcon class="size-4.5" />
          ) : (
            <MaximizeIcon class="size-4.5" />
          )}
        </button>

        <button
          aria-label={`${props.id} 채팅 토글`}
          class="pointer-events-auto grid size-9 place-items-center rounded-full bg-black/65 text-white/80 shadow-lg ring-1 ring-white/15 backdrop-blur-sm transition hover:bg-black/85 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          hidden={props.displayState === 'minimized'}
          onClick={handleChat}
          title="채팅 토글"
          type="button"
        >
          <ChatIcon class="size-4.5" />
        </button>
      </div>
    </div>
  );
};

export default Player;
