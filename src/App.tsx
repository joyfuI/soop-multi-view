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
import Player from './Player';
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
    const set = new Set<string>(list());
    set.add(id);
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
        let tileWidth = 0;

        for (let columns = 1; columns <= maximizedIds.length; columns += 1) {
          const rows = Math.ceil(maximizedIds.length / columns);
          const candidateWidth = Math.min(
            containerWidth / columns,
            (maximizedAreaHeight / rows) * PLAYER_ASPECT_RATIO,
          );
          const hasSameSize = Math.abs(candidateWidth - tileWidth) < 0.01;
          const isPreferredTie =
            hasSameSize &&
            (containerWidth >= maximizedAreaHeight
              ? columns > columnCount
              : columns < columnCount);

          if (candidateWidth > tileWidth + 0.01 || isPreferredTie) {
            columnCount = columns;
            tileWidth = candidateWidth;
          }
        }

        const safeTileWidth = Math.floor(tileWidth * 100) / 100;
        const tileHeight = safeTileWidth / PLAYER_ASPECT_RATIO;
        const rowCount = Math.ceil(maximizedIds.length / columnCount);
        const gridHeight = rowCount * tileHeight;

        maximizedIds.forEach((id, index) => {
          const row = Math.floor(index / columnCount);
          const column = index % columnCount;
          const rowStartIndex = row * columnCount;
          const itemsInRow = Math.min(
            columnCount,
            maximizedIds.length - rowStartIndex,
          );
          const rowWidth = itemsInRow * safeTileWidth;

          nextLayouts[id] = {
            height: tileHeight,
            width: safeTileWidth,
            x:
              safeScrollLeft +
              (containerWidth - rowWidth) / 2 +
              column * safeTileWidth,
            y: (maximizedAreaHeight - gridHeight) / 2 + row * tileHeight,
          };
        });
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
              id={item}
              layout={playerLayouts()[item]}
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
