import { createEffect, createSignal, onCleanup } from 'solid-js';

import type { MenuItemDisplayState } from './components/MenuItem';

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
  onDisplayStateChange?: (displayState: MenuItemDisplayState) => void;
  readyVersion: number;
};

const origin = 'https://play.sooplive.com';

const Player = (props: PlayerProps) => {
  let iframe: HTMLIFrameElement | undefined;

  const [showChat, setShowChat] = createSignal<boolean>(true);
  let handledReadyVersion = 0;

  const handleRefresh = () => {
    iframe?.contentWindow?.postMessage({ cmd: 'Pplay' }, origin);
  };

  const setChatVisible = (visible: boolean) => {
    if (showChat() === visible) {
      return;
    }
    iframe?.contentWindow?.postMessage({ cmd: 'PtoggleChat' }, origin);
    setShowChat(visible);
  };

  const handleChat = () => {
    if (props.displayState === 'minimized') {
      setChatVisible(false);
      return;
    }
    setChatVisible(!showChat());
  };

  const handleDisplayStateChange = () => {
    props.onDisplayStateChange?.(
      props.displayState === 'maximized' ? 'minimized' : 'maximized',
    );
  };

  createEffect(() => {
    const readyVersion = props.readyVersion;

    if (readyVersion === 0) {
      return;
    }

    if (readyVersion !== handledReadyVersion) {
      handledReadyVersion = readyVersion;
      setShowChat(true);
    }

    if (props.displayState === 'minimized') {
      setChatVisible(false);
    }
  });

  onCleanup(() => {
    props.ref(undefined);
  });

  return (
    <div
      class="group absolute top-0 left-0 overflow-hidden bg-black"
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
        class="h-full w-full border-0"
        name={`${props.id}`}
        ref={(element) => {
          iframe = element;
          props.ref(element);
        }}
        src={`https://play.sooplive.com/${props.id}/direct?fromApi=1`}
        title={`${props.id}`}
      />

      <div
        class="pointer-events-none absolute top-3 z-10 flex gap-1.5 opacity-0 transition-[right,opacity] duration-150 group-hover:opacity-100"
        style={{ right: showChat() ? 'calc(296px + 0.75rem)' : '0.75rem' }}
      >
        <button
          aria-label={`${props.id} 새로고침`}
          class="pointer-events-auto grid size-9 place-items-center rounded-full bg-black/65 text-white/80 shadow-lg ring-1 ring-white/15 backdrop-blur-sm transition hover:bg-black/85 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          onClick={handleRefresh}
          title="새로고침"
          type="button"
        >
          <svg
            aria-hidden="true"
            class="size-4.5"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              d="M20 11a8.1 8.1 0 1 0 .1 3M20 4v7h-7"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.8"
            />
          </svg>
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
          <svg
            aria-hidden="true"
            class="size-4.5"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              d={
                props.displayState === 'maximized'
                  ? 'M4 14h6v6M20 10h-6V4'
                  : 'M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7'
              }
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.8"
            />
          </svg>
        </button>

        <button
          aria-label={`${props.id} 채팅 토글`}
          class="pointer-events-auto grid size-9 place-items-center rounded-full bg-black/65 text-white/80 shadow-lg ring-1 ring-white/15 backdrop-blur-sm transition hover:bg-black/85 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          hidden={props.displayState === 'minimized'}
          onClick={handleChat}
          title="채팅 토글"
          type="button"
        >
          <svg
            aria-hidden="true"
            class="size-4.5"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              d="M20 11.5a7.5 7.5 0 0 1-8 7.5 9 9 0 0 1-3.8-.8L4 20l1.5-4A7.4 7.4 0 0 1 4 11.5C4 7.4 7.6 4 12 4s8 3.4 8 7.5Z"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.8"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Player;
