export const PLAYER_ASPECT_RATIO = 16 / 9;
export const PLAYER_CHAT_WIDTH = 296;

export const getMaximizedGrid = (
  ids: string[],
  chatVisibility: Record<string, boolean>,
  width: number,
  height: number,
) => {
  const isChatVisible = (id: string) => chatVisibility[id] ?? true;
  const openIds = ids.filter(isChatVisible);
  let columnCount = 1;
  let videoWidth = 0;
  let lastRowOpenChats: number | undefined;

  // Prefer the original ID order whenever reordering would not enlarge videos.
  for (let columns = 1; columns <= ids.length; columns += 1) {
    const rows = Math.ceil(ids.length / columns);
    let candidateWidth = (height / rows) * PLAYER_ASPECT_RATIO;

    for (let row = 0; row < rows; row += 1) {
      const rowIds = ids.slice(row * columns, (row + 1) * columns);
      const openChats = rowIds.filter(isChatVisible).length;
      candidateWidth = Math.min(
        candidateWidth,
        (width - openChats * PLAYER_CHAT_WIDTH) / rowIds.length,
      );
    }

    const isPreferredTie =
      Math.abs(candidateWidth - videoWidth) < 0.01 &&
      (width >= height ? columns > columnCount : columns < columnCount);

    if (candidateWidth > videoWidth + 0.01 || isPreferredTie) {
      columnCount = columns;
      videoWidth = Math.max(0, candidateWidth);
    }
  }

  for (let columns = 1; columns < ids.length; columns += 1) {
    const fullRows = Math.ceil(ids.length / columns) - 1;
    const lastRowSize = ids.length - fullRows * columns;
    const minLastRowChats = Math.max(0, openIds.length - fullRows * columns);
    const maxLastRowChats = Math.min(openIds.length, lastRowSize);

    // Full rows share chats evenly; only the shorter last row needs a search.
    for (
      let lastChats = minLastRowChats;
      lastChats <= maxLastRowChats;
      lastChats += 1
    ) {
      const fullRowChats = Math.ceil((openIds.length - lastChats) / fullRows);
      const candidateWidth = Math.min(
        (height / (fullRows + 1)) * PLAYER_ASPECT_RATIO,
        (width - fullRowChats * PLAYER_CHAT_WIDTH) / columns,
        (width - lastChats * PLAYER_CHAT_WIDTH) / lastRowSize,
      );
      const isPreferredTie =
        lastRowOpenChats !== undefined &&
        Math.abs(candidateWidth - videoWidth) < 0.01 &&
        (width >= height ? columns > columnCount : columns < columnCount);

      if (candidateWidth > videoWidth + 0.01 || isPreferredTie) {
        columnCount = columns;
        videoWidth = candidateWidth;
        lastRowOpenChats = lastChats;
      }
    }
  }

  const rowCount = Math.ceil(ids.length / columnCount);
  const rows: string[][] = [];
  const closedIds = ids.filter((id) => !isChatVisible(id));
  let openIndex = 0;
  let closedIndex = 0;

  for (let row = 0; row < rowCount; row += 1) {
    const rowSize = Math.min(columnCount, ids.length - row * columnCount);
    if (lastRowOpenChats === undefined) {
      rows.push(ids.slice(row * columnCount, row * columnCount + rowSize));
      continue;
    }

    const openChats =
      row === rowCount - 1
        ? lastRowOpenChats
        : Math.ceil(
            (openIds.length - openIndex - lastRowOpenChats) /
              (rowCount - row - 1),
          );
    rows.push([
      ...openIds.slice(openIndex, openIndex + openChats),
      ...closedIds.slice(closedIndex, closedIndex + rowSize - openChats),
    ]);
    openIndex += openChats;
    closedIndex += rowSize - openChats;
  }

  return { rows, videoWidth: Math.floor(videoWidth * 100) / 100 };
};
