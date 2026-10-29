export const PLAYER_ASPECT_RATIO = 16 / 9;
export const PLAYER_CHAT_WIDTH = 296;

export const getMaximizedGrid = (
  ids: string[],
  chatVisibility: Record<string, boolean>,
  width: number,
  height: number,
) => {
  const openIndices: number[] = [];
  const closedIndices: number[] = [];
  const openChatCounts = [0];
  ids.forEach((id, index) => {
    const visible = chatVisibility[id] ?? true;
    (visible ? openIndices : closedIndices).push(index);
    openChatCounts.push(openChatCounts[index] + Number(visible));
  });
  let columnCount = 1;
  let videoWidth = 0;
  let lastRowOpenChats: number | undefined;

  // Prefer the original ID order whenever reordering would not enlarge videos.
  for (let columns = 1; columns <= ids.length; columns += 1) {
    const rows = Math.ceil(ids.length / columns);
    let candidateWidth = (height / rows) * PLAYER_ASPECT_RATIO;

    for (let row = 0; row < rows; row += 1) {
      const start = row * columns;
      const end = Math.min(start + columns, ids.length);
      const openChats = openChatCounts[end] - openChatCounts[start];
      candidateWidth = Math.min(
        candidateWidth,
        (width - openChats * PLAYER_CHAT_WIDTH) / (end - start),
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
    const minLastRowChats = Math.max(
      0,
      openIndices.length - fullRows * columns,
    );
    const maxLastRowChats = Math.min(openIndices.length, lastRowSize);

    // Full rows share chats evenly; only the shorter last row needs a search.
    for (
      let lastChats = minLastRowChats;
      lastChats <= maxLastRowChats;
      lastChats += 1
    ) {
      const fullRowChats = Math.ceil(
        (openIndices.length - lastChats) / fullRows,
      );
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
            (openIndices.length - openIndex - lastRowOpenChats) /
              (rowCount - row - 1),
          );
    rows.push(
      [
        ...openIndices.slice(openIndex, openIndex + openChats),
        ...closedIndices.slice(closedIndex, closedIndex + rowSize - openChats),
      ]
        .sort((a, b) => a - b)
        .map((index) => ids[index]),
    );
    openIndex += openChats;
    closedIndex += rowSize - openChats;
  }

  return { rows, videoWidth: Math.floor(videoWidth * 100) / 100 };
};
