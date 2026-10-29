import assert from 'node:assert/strict';

import {
  getMaximizedGrid,
  PLAYER_ASPECT_RATIO,
  PLAYER_CHAT_WIDTH,
} from '../src/helper/playerGrid.ts';

const ids = ['a', 'b', 'c', 'd'];
const visibility = { a: true, b: true, c: false, d: false };
const balanced = getMaximizedGrid(ids, visibility, 1920, 1080);
assert.deepEqual(balanced.rows, [
  ['a', 'c'],
  ['b', 'd'],
]);
assert.equal(balanced.videoWidth, 812);
for (const chatVisibility of [{}, { a: false, b: false, c: false, d: false }]) {
  assert.deepEqual(getMaximizedGrid(ids, chatVisibility, 1920, 1080).rows, [
    ['a', 'b'],
    ['c', 'd'],
  ]);
}
assert.deepEqual(
  getMaximizedGrid(balanced.rows.flat(), visibility, 1920, 1080),
  balanced,
);
assert.deepEqual(getMaximizedGrid(ids, visibility, 1920, 720).rows, [
  ['a', 'b'],
  ['c', 'd'],
]);
assert.deepEqual(getMaximizedGrid([], {}, 1920, 1080), {
  rows: [],
  videoWidth: 0,
});

const urlIds = ['dlsn9911', 'kgoyangyeeee', 'yangdoki', 'toocat030'];
const offFirstVisibility = {
  dlsn9911: false,
  kgoyangyeeee: false,
  yangdoki: true,
  toocat030: true,
};
assert.deepEqual(getMaximizedGrid(urlIds, offFirstVisibility, 1912, 901), {
  rows: [
    ['dlsn9911', 'yangdoki'],
    ['kgoyangyeeee', 'toocat030'],
  ],
  videoWidth: 800.88,
});
assert.deepEqual(
  getMaximizedGrid(urlIds, offFirstVisibility, 1912, 720).rows.flat(),
  urlIds,
);

const partial = getMaximizedGrid(
  ['a', 'b', 'c', 'd', 'e'],
  { a: true, b: true, c: true, d: false, e: false },
  3000,
  1080,
);
assert.deepEqual(partial.rows, [
  ['a', 'd', 'e'],
  ['b', 'c'],
]);
assert.equal(partial.videoWidth, 901.33);

// Compare against every possible row chat allocation.
const exhaustiveWidth = (count, chats, width, height) => {
  let best = 0;
  for (let columns = 1; columns <= count; columns += 1) {
    const rows = Math.ceil(count / columns);
    const visit = (row, remainingChats, limit) => {
      if (row === rows) {
        if (remainingChats === 0) best = Math.max(best, limit);
        return;
      }
      const size = Math.min(columns, count - row * columns);
      for (
        let open = Math.max(0, remainingChats - (count - row * columns - size));
        open <= Math.min(size, remainingChats);
        open += 1
      ) {
        visit(
          row + 1,
          remainingChats - open,
          Math.min(limit, (width - open * PLAYER_CHAT_WIDTH) / size),
        );
      }
    };
    visit(0, chats, (height / rows) * PLAYER_ASPECT_RATIO);
  }
  return best;
};

let cases = 0;
for (let count = 1; count <= 12; count += 1) {
  const players = Object.freeze(
    Array.from({ length: count }, (_, index) => `p${index}`),
  );
  for (const [width, height] of [
    [390, 844],
    [800, 600],
    [1912, 901],
    [1920, 1080],
    [1080, 1920],
    [3000, 1080],
    [1001.37, 671.23],
  ]) {
    const bestWidths = Array.from({ length: count + 1 }, (_, chats) =>
      exhaustiveWidth(count, chats, width, height),
    );
    for (let mask = 0; mask < 2 ** count; mask += 1) {
      const visible = Object.freeze(
        Object.fromEntries(
          players.map((id, index) => [id, Boolean(mask & (1 << index))]),
        ),
      );
      const chats = players.filter((id) => visible[id]).length;
      const grid = getMaximizedGrid(players, visible, width, height);
      assert.ok(Math.abs(grid.videoWidth - bestWidths[chats]) < 0.021);
      assert.deepEqual(grid.rows.flat().toSorted(), players.toSorted());
      assert.ok(
        (grid.rows.length * grid.videoWidth) / PLAYER_ASPECT_RATIO <= height,
      );
      for (const row of grid.rows) {
        const positions = row.map((id) => players.indexOf(id));
        assert.deepEqual(
          positions,
          positions.toSorted((a, b) => a - b),
        );
        const rowWidth =
          row.length * grid.videoWidth +
          row.filter((id) => visible[id]).length * PLAYER_CHAT_WIDTH;
        assert.ok(rowWidth <= width + 0.001);
      }
      assert.deepEqual(
        getMaximizedGrid(grid.rows.flat(), visible, width, height),
        grid,
      );
      cases += 1;
    }
  }
}
console.log(`Player grid checks passed: ${cases} exhaustive comparisons`);
