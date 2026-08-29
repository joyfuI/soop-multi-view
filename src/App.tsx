import { useLocation, useNavigate } from '@solidjs/router';
import {
  createEffect,
  createMemo,
  createSignal,
  For,
  onCleanup,
  onMount,
} from 'solid-js';

import Menu from './components/Menu';
import type { MenuItemDisplayState } from './components/MenuItem';
import type { PlayerLayout } from './Player';
import Player, { PLAYER_CHAT_WIDTH } from './Player';
import { createLocalStorage } from './primitives/createStorage';
import useHomeBroadQuery from './primitives/useHomeBroadQuery';
import useStationInfoQuery from './primitives/useStationInfoQuery';

const PLAYER_ASPECT_RATIO = 16 / 9;
const MINIMIZED_MAX_WIDTH = 320;
const MINIMIZED_MIN_WIDTH = 200;
const MINIMIZED_VIEWPORT_RATIO = 0.32;
const MINIMIZED_GAP = 8;
const MINIMIZED_PADDING = 8;

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
  const pendingPlayerLoads = new Set<string>();
  let playerStage!: HTMLElement;

  const [stageSize, setStageSize] = createSignal<StageSize>({
    width: 0,
    height: 0,
  });
  const [stageScrollLeft, setStageScrollLeft] = createSignal(0);
  const [playerLayouts, setPlayerLayouts] = createSignal<
    Record<string, PlayerLayout>
  >({});
  const [playerChatVisibility, setPlayerChatVisibility] = createSignal<
    Record<string, boolean>
  >({});
  const [playerFrameReadyVersions, setPlayerFrameReadyVersions] = createSignal<
    Record<string, number>
  >({});
  const [playerReadyVersions, setPlayerReadyVersions] = createSignal<
    Record<string, number>
  >({});
  const [list, setList] = createLocalStorage<string[]>('list', []);
  const [state, setState] = createLocalStorage<
    Record<string, { display: MenuItemDisplayState }>
  >('state', {});

  const navigate = useNavigate();
  const location = useLocation();
  const ids = location.pathname
    .split('/')
    .slice(1)
    .map(decodeURIComponent)
    .filter(Boolean);

  const stationInfoQueries = useStationInfoQuery(list);
  const homeBroadQueries = useHomeBroadQuery(list);

  onMount(() => {
    if (ids.length === 0) {
      navigate(`/${list().join('/')}`, { replace: true });
    } else {
      setList(ids);
    }
  });

  onMount(() => {
    const markPlayerLoaded = (id: string) => {
      if (!pendingPlayerLoads.delete(id)) {
        return;
      }

      setPlayerReadyVersions((versions) => ({
        ...versions,
        [id]: (versions[id] ?? 0) + 1,
      }));
    };

    const handleMessage = (event: MessageEvent) => {
      if (event.origin === 'https://play.sooplive.com') {
        const iframe = [...iframes.values()].find(
          (item) => item.contentWindow === event.source,
        );
        if (!iframe) {
          return;
        }

        switch (event.data.cmd) {
          case 'PonReady': // 플레이어 로드
            pendingPlayerLoads.add(iframe.name);
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
            setPlayerFrameReadyVersions((versions) => ({
              ...versions,
              [iframe.name]: (versions[iframe.name] ?? 0) + 1,
            }));
            break;

          case 'PupdateMediaEvent':
            markPlayerLoaded(iframe.name);
            break;

          case 'PupdateBroadInfo': // 방송 정보
            iframe.title = event.data.data.title;
            break;
        }
      }
    };

    window.addEventListener('message', handleMessage);

    onCleanup(() => {
      window.removeEventListener('message', handleMessage);
    });
  });

  const handleAdd = (id: string) => {
    const normalizedId = id.trim();
    if (!normalizedId) {
      return;
    }

    const set = new Set<string>(list());
    set.add(normalizedId);
    const newList = [...set];
    navigate(`/${newList.join('/')}`, { replace: true });
    setList(newList);
  };

  const handleDelete = (id: string) => {
    const set = new Set<string>(list());
    set.delete(id);
    const newList = [...set];
    navigate(`/${newList.join('/')}`, { replace: true });
    setList(newList);
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
    setState({ ...state(), [id]: { ...state()?.[id], display: displayState } });
  };

  const minimizedIds = createMemo(() => {
    const currentState = state();
    return list().filter(
      (id) => getDisplayState(currentState, id) === 'minimized',
    );
  });

  const minimizedMetrics = createMemo(() => {
    const count = minimizedIds().length;
    const tileWidth = getMinimizedTileWidth(stageSize().width);
    const tileHeight = tileWidth / PLAYER_ASPECT_RATIO;
    const contentWidth =
      count === 0
        ? stageSize().width
        : MINIMIZED_PADDING * 2 +
          tileWidth * count +
          MINIMIZED_GAP * (count - 1);

    return {
      contentWidth: Math.max(stageSize().width, contentWidth),
      railHeight: count === 0 ? 0 : tileHeight + MINIMIZED_PADDING * 2,
      tileHeight,
      tileWidth,
    };
  });

  createEffect(() => {
    const ids = list();
    const currentState = state();
    const currentChatVisibility = playerChatVisibility();
    const { width: containerWidth, height: containerHeight } = stageSize();
    const metrics = minimizedMetrics();
    const maximizedIds = ids.filter(
      (id) => getDisplayState(currentState, id) === 'maximized',
    );
    const currentMinimizedIds = minimizedIds();

    if (containerWidth <= 0 || containerHeight <= 0) return;

    const maxScrollLeft = Math.max(0, metrics.contentWidth - containerWidth);
    const safeScrollLeft = Math.min(stageScrollLeft(), maxScrollLeft);

    if (playerStage && playerStage.scrollLeft !== safeScrollLeft) {
      playerStage.scrollLeft = safeScrollLeft;
      setStageScrollLeft(safeScrollLeft);
    }

    setPlayerLayouts((previousLayouts) => {
      const nextLayouts: Record<string, PlayerLayout> = {};

      for (const id of ids) {
        nextLayouts[id] = previousLayouts[id] ?? {
          height: containerWidth / PLAYER_ASPECT_RATIO,
          width: containerWidth,
          x: safeScrollLeft,
          y: 0,
        };
      }

      const maximizedAreaHeight = Math.max(
        0,
        containerHeight - metrics.railHeight,
      );

      if (maximizedIds.length > 0 && maximizedAreaHeight > 0) {
        let columnCount = 1;
        let videoWidth = 0;

        for (let columns = 1; columns <= maximizedIds.length; columns += 1) {
          const rows = Math.ceil(maximizedIds.length / columns);
          let widthConstrainedVideoWidth = Number.POSITIVE_INFINITY;

          for (let row = 0; row < rows; row += 1) {
            const rowIds = maximizedIds.slice(
              row * columns,
              (row + 1) * columns,
            );
            const openChatCount = rowIds.filter(
              (id) => currentChatVisibility[id] ?? true,
            ).length;
            const availableVideoWidth =
              containerWidth - openChatCount * PLAYER_CHAT_WIDTH;

            widthConstrainedVideoWidth = Math.min(
              widthConstrainedVideoWidth,
              availableVideoWidth / rowIds.length,
            );
          }

          const candidateVideoWidth = Math.min(
            widthConstrainedVideoWidth,
            (maximizedAreaHeight / rows) * PLAYER_ASPECT_RATIO,
          );
          const hasSameSize = Math.abs(candidateVideoWidth - videoWidth) < 0.01;
          const isPreferredTie =
            hasSameSize &&
            (containerWidth >= maximizedAreaHeight
              ? columns > columnCount
              : columns < columnCount);

          if (candidateVideoWidth > videoWidth + 0.01 || isPreferredTie) {
            columnCount = columns;
            videoWidth = candidateVideoWidth;
          }
        }

        const safeVideoWidth = Math.floor(videoWidth * 100) / 100;
        const tileHeight = safeVideoWidth / PLAYER_ASPECT_RATIO;
        const rowCount = Math.ceil(maximizedIds.length / columnCount);
        const gridHeight = rowCount * tileHeight;

        for (let row = 0; row < rowCount; row += 1) {
          const rowStartIndex = row * columnCount;
          const rowIds = maximizedIds.slice(
            rowStartIndex,
            rowStartIndex + columnCount,
          );
          const rowWidth = rowIds.reduce(
            (width, id) =>
              width +
              safeVideoWidth +
              ((currentChatVisibility[id] ?? true) ? PLAYER_CHAT_WIDTH : 0),
            0,
          );
          let tileX = safeScrollLeft + (containerWidth - rowWidth) / 2;

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
        }
      }

      currentMinimizedIds.forEach((id, index) => {
        nextLayouts[id] = {
          height: metrics.tileHeight,
          width: metrics.tileWidth,
          x: MINIMIZED_PADDING + index * (metrics.tileWidth + MINIMIZED_GAP),
          y: containerHeight - metrics.tileHeight - MINIMIZED_PADDING,
        };
      });

      return nextLayouts;
    });
  });

  return (
    <>
      <Menu
        data={list().map((item, index) => ({
          id: item,
          name: stationInfoQueries[index]?.data?.station.userNick ?? item,
          online: !!homeBroadQueries[index]?.data,
          displayState: state()[item]?.display ?? 'maximized',
        }))}
        onAdd={handleAdd}
        onDelete={handleDelete}
        onDisplayStateChange={handleDisplayStateChange}
        onOpen={() => {
          for (const query of homeBroadQueries) {
            query.refetch({ cancelRefetch: false });
          }
        }}
      />

      <main
        class="relative h-dvh w-full overflow-x-auto overflow-y-hidden bg-black [scrollbar-color:rgba(255,255,255,0.25)_transparent] scrollbar-thin"
        onScroll={(event) => {
          setStageScrollLeft(event.currentTarget.scrollLeft);
        }}
        ref={(element) => {
          playerStage = element;

          const updateStageSize = () => {
            setStageSize({
              height: element.clientHeight,
              width: element.clientWidth,
            });
          };

          const resizeObserver = new ResizeObserver(updateStageSize);

          resizeObserver.observe(element);
          updateStageSize();

          onCleanup(() => {
            resizeObserver.disconnect();
          });
        }}
      >
        <div
          aria-hidden="true"
          class="pointer-events-none h-px"
          style={{ width: `${minimizedMetrics().contentWidth}px` }}
        />

        <For each={list()}>
          {(item) => (
            <Player
              displayState={state()[item]?.display ?? 'maximized'}
              frameReadyVersion={playerFrameReadyVersions()[item] ?? 0}
              id={item}
              layout={playerLayouts()[item]}
              onChatVisibilityChange={(visible) => {
                handleChatVisibilityChange(item, visible);
              }}
              onDisplayStateChange={(displayState) => {
                handleDisplayStateChange(item, displayState);
              }}
              readyVersion={playerReadyVersions()[item] ?? 0}
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
    </>
  );
};

export default App;
