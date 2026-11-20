import { useLocation, useNavigate } from '@solidjs/router';
import {
  createEffect,
  createMemo,
  createSignal,
  For,
  latest,
  onSettled,
  Show,
  untrack,
} from 'solid-js';

import Menu from './components/Menu';
import type { MenuItemDisplayState } from './components/MenuItem';
import UserscriptNotice from './components/UserscriptNotice';
import { makeIdsPath, normalizeId, normalizeIds, parseIds } from './helper/ids';
import {
  getMaximizedGrid,
  PLAYER_ASPECT_RATIO,
  PLAYER_CHAT_WIDTH,
} from './helper/playerGrid';
import {
  createUserscriptCheck,
  getBrowserFamily,
  type UserscriptStatus,
} from './helper/userscript';
import type { PlayerLayout } from './Player';
import Player from './Player';
import { createLocalStorage } from './primitives/createStorage';
import useHomeBroadQuery from './primitives/useHomeBroadQuery';
import useStationInfoQuery from './primitives/useStationInfoQuery';

const MINIMIZED_MAX_WIDTH = 320;
const MINIMIZED_MIN_WIDTH = 200;
const MINIMIZED_VIEWPORT_RATIO = 0.32;

type StageSize = { width: number; height: number };

const getDisplayState = (
  state: Record<string, { display: MenuItemDisplayState }>,
  id: string,
) => state[id]?.display ?? 'maximized';

const getMinimizedTileWidth = (containerWidth: number) =>
  Math.min(
    MINIMIZED_MAX_WIDTH,
    Math.max(MINIMIZED_MIN_WIDTH, containerWidth * MINIMIZED_VIEWPORT_RATIO),
  );

const App = () => {
  const iframes = new Map<string, HTMLIFrameElement>();
  let playerStage!: HTMLElement;
  const browserFamily = getBrowserFamily(navigator);
  const [userscriptStatus, setUserscriptStatus] =
    createSignal<UserscriptStatus>('checking');
  const [userscriptGuideOpen, setUserscriptGuideOpen] = createSignal(false);
  const [userscriptNoticeDismissed, setUserscriptNoticeDismissed] =
    createLocalStorage('userscript-notice-dismissed', false);
  const userscriptCheck = createUserscriptCheck((status) => {
    setUserscriptStatus(status);
    if (status === 'active') setUserscriptGuideOpen(false);
  });
  const userscriptNeedsAttention = () => {
    const status = userscriptStatus();
    return status === 'missing' || status === 'outdated';
  };
  const showUserscriptNotice = () =>
    ids().length === 0 ||
    (userscriptNeedsAttention() &&
      (userscriptGuideOpen() || !userscriptNoticeDismissed()));

  const [stageSize, setStageSize] = createSignal<StageSize>({
    width: 0,
    height: 0,
  });
  const [stageScrollLeft, setStageScrollLeft] = createSignal(0);
  const [playerChatVisibility, setPlayerChatVisibility] = createSignal<
    Record<string, boolean>
  >({});
  const [list, setList] = createLocalStorage<string[]>('list', []);
  const [state, setState] = createLocalStorage<
    Record<string, { display: MenuItemDisplayState }>
  >('state', {});

  const navigate = useNavigate();
  const location = useLocation();
  const ids = createMemo(() => parseIds(location.pathname));

  const stationInfoQueries = useStationInfoQuery(ids);
  const homeBroadQueries = useHomeBroadQuery(ids);

  const setIds = (newIds: string[]) => {
    const normalizedIds = normalizeIds(newIds);
    const path = makeIdsPath(normalizedIds);
    setList(normalizedIds);
    if (path !== untrack(() => location.pathname)) {
      navigate(path, { replace: true });
    }
  };

  createEffect(
    () => {
      const restore = location.pathname === '/';
      return { currentIds: restore ? list() : ids(), restore };
    },
    ({ currentIds, restore }) => {
      if (restore) setIds(currentIds);
      else setList(currentIds);
    },
  );

  onSettled(() => {
    const handleMessage = (event: MessageEvent) => {
      userscriptCheck.receive(event);
      if (event.origin === 'https://play.sooplive.com') {
        const iframe = [...iframes.values()].find(
          (item) => item.contentWindow === event.source,
        );
        if (!iframe) {
          return;
        }

        switch (event.data?.cmd) {
          case 'PonReady': // 플레이어 로드
            iframe.contentWindow?.postMessage(
              {
                cmd: 'Pload',
                id: iframe.name,
                mutePlay: false,
                autoPlay: true,
                isAdShow: false,
                showChat: true,
                showQualityBox: true,
                fromApi: '1',
              },
              event.origin,
            );
            break;

          case 'PupdateBroadInfo': // 방송 정보
            iframe.title = event.data.data.title;
            break;
        }
      }
    };

    window.addEventListener('message', handleMessage);
    userscriptCheck.checkPage();

    return () => {
      window.removeEventListener('message', handleMessage);
      userscriptCheck.dispose();
    };
  });

  onSettled(() => {
    const updateStageSize = () => {
      const { clientHeight: height, clientWidth: width } = playerStage;
      setStageSize((size) =>
        size.height === height && size.width === width
          ? size
          : { height, width },
      );
    };

    // 배치가 스크롤바를 바꿀 수 있으므로 다음 프레임에서 측정한다.
    let frame = 0;
    const resizeObserver = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateStageSize);
    });
    resizeObserver.observe(playerStage);
    updateStageSize();
    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(frame);
    };
  });

  const handleAdd = (id: string) => {
    const normalizedId = normalizeId(id);
    if (!normalizedId) {
      return;
    }

    const newIds = [...new Set([...ids(), normalizedId])];
    setIds(newIds);
  };

  const handleDelete = (id: string) => {
    const newIds = ids().filter((item) => item !== id);
    setIds(newIds);
    setPlayerChatVisibility((visibility) => {
      if (!(id in visibility)) {
        return visibility;
      }

      const nextVisibility = { ...visibility };
      delete nextVisibility[id];
      return nextVisibility;
    });
  };

  const handleChatVisibilityChange = (id: string, visible: boolean) => {
    setPlayerChatVisibility((visibility) =>
      visibility[id] === visible
        ? visibility
        : { ...visibility, [id]: visible },
    );
  };

  const handleDisplayStateChange = (
    id: string,
    displayState: MenuItemDisplayState,
  ) => {
    setState((previous) => ({
      ...previous,
      [id]: { ...previous?.[id], display: displayState },
    }));
  };

  const minimizedIds = createMemo(() => {
    const currentState = state();
    return ids().filter(
      (id) => getDisplayState(currentState, id) === 'minimized',
    );
  });

  const minimizedMetrics = createMemo(() => {
    const count = minimizedIds().length;
    const tileWidth = getMinimizedTileWidth(stageSize().width);
    const tileHeight = tileWidth / PLAYER_ASPECT_RATIO;
    const contentWidth = count === 0 ? stageSize().width : tileWidth * count;

    return {
      contentWidth: Math.max(stageSize().width, contentWidth),
      railHeight: count === 0 ? 0 : tileHeight,
      tileHeight,
      tileWidth,
    };
  });

  const safeScrollLeft = createMemo(() => {
    const maxScrollLeft = Math.max(
      0,
      minimizedMetrics().contentWidth - stageSize().width,
    );
    return Math.min(stageScrollLeft(), maxScrollLeft);
  });

  createEffect(safeScrollLeft, (scrollLeft) => {
    if (playerStage && playerStage.scrollLeft !== scrollLeft) {
      playerStage.scrollLeft = scrollLeft;
      setStageScrollLeft(scrollLeft);
    }
  });

  const playerLayouts = createMemo<Record<string, PlayerLayout>>(
    (previousLayouts) => {
      const { width: containerWidth, height: containerHeight } = stageSize();
      if (containerWidth <= 0 || containerHeight <= 0)
        return previousLayouts ?? {};

      const currentIds = ids();
      const currentState = state();
      const currentChatVisibility = playerChatVisibility();
      const metrics = minimizedMetrics();
      const scrollLeft = safeScrollLeft();
      const maximizedIds = currentIds.filter(
        (id) => getDisplayState(currentState, id) === 'maximized',
      );
      const currentMinimizedIds = minimizedIds();

      const nextLayouts: Record<string, PlayerLayout> = {};

      for (const id of currentIds) {
        nextLayouts[id] = previousLayouts?.[id] ?? {
          height: containerWidth / PLAYER_ASPECT_RATIO,
          width: containerWidth,
          x: scrollLeft,
          y: 0,
        };
      }

      const maximizedAreaHeight = Math.max(
        0,
        containerHeight - metrics.railHeight,
      );

      if (maximizedIds.length > 0 && maximizedAreaHeight > 0) {
        const { rows, videoWidth: safeVideoWidth } = getMaximizedGrid(
          maximizedIds,
          currentChatVisibility,
          containerWidth,
          maximizedAreaHeight,
        );
        const tileHeight = safeVideoWidth / PLAYER_ASPECT_RATIO;
        const gridHeight = rows.length * tileHeight;

        rows.forEach((rowIds, row) => {
          const rowWidth = rowIds.reduce(
            (width, id) =>
              width +
              safeVideoWidth +
              ((currentChatVisibility[id] ?? true) ? PLAYER_CHAT_WIDTH : 0),
            0,
          );
          let tileX = scrollLeft + (containerWidth - rowWidth) / 2;

          for (const id of rowIds) {
            const tileWidth =
              safeVideoWidth +
              ((currentChatVisibility[id] ?? true) ? PLAYER_CHAT_WIDTH : 0);

            nextLayouts[id] = {
              height: tileHeight,
              width: tileWidth,
              x: tileX,
              y: (maximizedAreaHeight - gridHeight) / 2 + row * tileHeight,
            };
            tileX += tileWidth;
          }
        });
      }

      currentMinimizedIds.forEach((id, index) => {
        nextLayouts[id] = {
          height: metrics.tileHeight,
          width: metrics.tileWidth,
          x: index * metrics.tileWidth,
          y: containerHeight - metrics.tileHeight,
        };
      });

      return nextLayouts;
    },
  );

  return (
    <div class="flex h-dvh flex-col overflow-hidden bg-black">
      <Menu
        data={ids().map((item, index) => {
          const stationInfo = stationInfoQueries[index];
          const homeBroad = homeBroadQueries[index];
          // 메타데이터를 기다리는 동안에도 메뉴와 플레이어를 표시한다.
          return {
            id: item,
            name: stationInfo?.dataUpdatedAt
              ? (latest(() => stationInfo.data)?.station.userNick ?? item)
              : item,
            online: !!(
              homeBroad?.dataUpdatedAt && latest(() => homeBroad.data)
            ),
            displayState: state()[item]?.display ?? 'maximized',
          };
        })}
        onAdd={handleAdd}
        onDelete={handleDelete}
        onDisplayStateChange={handleDisplayStateChange}
        onOpen={() => {
          for (const query of homeBroadQueries) {
            query.refetch({ cancelRefetch: false });
          }
        }}
        onOpenUserscriptGuide={
          userscriptNeedsAttention()
            ? () => setUserscriptGuideOpen(true)
            : undefined
        }
      />

      <Show when={showUserscriptNotice()}>
        <UserscriptNotice
          chromium={browserFamily === 'chromium'}
          empty={ids().length === 0}
          onClose={() => {
            setUserscriptNoticeDismissed(true);
            setUserscriptGuideOpen(false);
          }}
          status={userscriptStatus()}
        />
      </Show>

      <main
        class="relative min-h-0 w-full flex-1 overflow-x-auto overflow-y-hidden bg-black [scrollbar-color:rgba(255,255,255,0.25)_transparent] scrollbar-thin"
        onScroll={(event) => {
          setStageScrollLeft(event.currentTarget.scrollLeft);
        }}
        ref={playerStage}
      >
        <div
          aria-hidden="true"
          class="pointer-events-none h-px"
          style={{ width: `${minimizedMetrics().contentWidth}px` }}
        />

        <For each={ids()}>
          {(item) => (
            <Player
              displayState={state()[item]?.display ?? 'maximized'}
              id={item}
              layout={playerLayouts()[item]}
              onChatVisibilityChange={(visible) => {
                handleChatVisibilityChange(item, visible);
              }}
              onDisplayStateChange={(displayState) => {
                handleDisplayStateChange(item, displayState);
              }}
              ref={(element) => {
                if (element) {
                  iframes.set(item, element);
                } else {
                  iframes.delete(item);
                }
              }}
            />
          )}
        </For>
      </main>
    </div>
  );
};

export default App;
