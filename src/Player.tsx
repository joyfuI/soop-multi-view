import { createEffect, createSignal, onCleanup } from 'solid-js';

import {
  ChatIcon,
  MaximizeIcon,
  MinimizeIcon,
  RefreshIcon,
} from './components/icons';
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
  frameReadyVersion: number;
  layout?: PlayerLayout;
  onChatVisibilityChange?: (visible: boolean) => void;
  onDisplayStateChange?: (displayState: MenuItemDisplayState) => void;
  readyVersion: number;
};

const origin = 'https://play.sooplive.com';
const PLAYER_BOOTSTRAP_HEIGHT = 360;
const PLAYER_BOOTSTRAP_WIDTH = 640;
const PLAYER_FALLBACK_REVEAL_DELAY_MS = 1000;

const Player = (props: PlayerProps) => {
  let iframe: HTMLIFrameElement | undefined;
  let fallbackRevealTimer: number | undefined;

  const [isPlayerVisible, setIsPlayerVisible] = createSignal(false);
  const [isPlayerUsingActualSize, setIsPlayerUsingActualSize] =
    createSignal(false);
  const [isPlayerReady, setIsPlayerReady] = createSignal(false);
  const [showChat, setShowChat] = createSignal<boolean>(true);
  let handledFrameReadyVersion = props.frameReadyVersion;
  let handledReadyVersion = props.readyVersion;
  let previousDisplayState = props.displayState;

  const clearFallbackRevealTimer = () => {
    if (fallbackRevealTimer === undefined) {
      return;
    }

    window.clearTimeout(fallbackRevealTimer);
    fallbackRevealTimer = undefined;
  };

  const handleRefresh = () => {
    iframe?.contentWindow?.postMessage({ cmd: 'Pplay' }, origin);
  };

  const updateChatVisibility = (visible: boolean) => {
    if (showChat() === visible) {
      return false;
    }

    setShowChat(visible);
    props.onChatVisibilityChange?.(visible);
    return true;
  };

  const setChatVisible = (visible: boolean) => {
    if (showChat() === visible) {
      return;
    }
    iframe?.contentWindow?.postMessage({ cmd: 'PtoggleChat' }, origin);
    updateChatVisibility(visible);
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
    const frameReadyVersion = props.frameReadyVersion;

    if (frameReadyVersion === handledFrameReadyVersion) {
      return;
    }

    handledFrameReadyVersion = frameReadyVersion;
    clearFallbackRevealTimer();

    if (isPlayerReady()) {
      setIsPlayerVisible(true);
      return;
    }

    // A successful autoplay is revealed by PupdateMediaEvent. If that event
    // never arrives, expose SOOP's own controls so the user can start playback.
    fallbackRevealTimer = window.setTimeout(() => {
      fallbackRevealTimer = undefined;
      setIsPlayerUsingActualSize(true);
      setIsPlayerVisible(true);
    }, PLAYER_FALLBACK_REVEAL_DELAY_MS);
  });

  createEffect(() => {
    const readyVersion = props.readyVersion;
    const displayState = props.displayState;
    const wasMinimized = previousDisplayState === 'minimized';

    previousDisplayState = displayState;

    if (readyVersion !== handledReadyVersion) {
      handledReadyVersion = readyVersion;
      clearFallbackRevealTimer();
      setIsPlayerUsingActualSize(true);
      setIsPlayerVisible(true);
      setIsPlayerReady(true);
      updateChatVisibility(true);
    }

    if (!isPlayerReady()) {
      return;
    }

    if (displayState === 'minimized') {
      setChatVisible(false);
    } else if (displayState === 'maximized' && wasMinimized) {
      setChatVisible(true);
    }
  });

  onCleanup(() => {
    clearFallbackRevealTimer();
    props.ref(undefined);
  });

  return (
    <div
      class="group absolute top-0 left-0 overflow-hidden bg-black"
      data-display-state={props.displayState}
      data-player-actual-size={isPlayerUsingActualSize()}
      data-player-id={props.id}
      data-player-ready={isPlayerReady()}
      data-player-visible={isPlayerVisible()}
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
        src={`https://play.sooplive.com/${props.id}/direct?fromApi=1`}
        style={{
          height: isPlayerUsingActualSize()
            ? '100%'
            : `${PLAYER_BOOTSTRAP_HEIGHT}px`,
          opacity: isPlayerVisible() ? 1 : 0,
          'pointer-events': isPlayerVisible() ? 'auto' : 'none',
          width: isPlayerUsingActualSize()
            ? '100%'
            : `${PLAYER_BOOTSTRAP_WIDTH}px`,
        }}
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
