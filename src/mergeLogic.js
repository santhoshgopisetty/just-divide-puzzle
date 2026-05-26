/**
 * mergeLogic.js
 * =============================================================
 * Core math & merge engine for Just Divide.
 *
 * MERGE RULES (applied after every tile placement):
 * ─────────────────────────────────────────────────
 *  1. EQUAL        → Two identical adjacent tiles both vanish.
 *                     e.g. 4 next to 4 → both removed.
 *                     Score: value × 2.
 *
 *  2. DIVISIBLE    → If the larger is evenly divisible by the smaller,
 *                     the larger becomes (larger ÷ smaller), the smaller vanishes.
 *                     e.g. 12 next to 3 → 12 becomes 4, 3 removed.
 *                     Score: smaller × 2.
 *
 *  3. RESULT IS 1  → If a division produces 1, that tile is also removed.
 *                     e.g. 6 next to 6 hits rule #1 first. But if
 *                     8 next to 8 → equal → both removed. Or
 *                     5 next to 5 → equal → both removed.
 *                     Separately, 6 ÷ 6 → 1 → removed.
 *                     Score: +5 bonus for cleaning a "1".
 *
 *  4. CHAIN REACT  → After each merge, re-check ALL neighbors of every
 *                     cell that changed. Repeat until no more merges happen.
 *
 * ADJACENCY:
 *   For a cell at (r, c), neighbors are:
 *     UP    (r-1, c)
 *     DOWN  (r+1, c)
 *     LEFT  (r, c-1)
 *     RIGHT (r, c+1)
 *   Diagonals do NOT count.
 *
 * FUNCTION SIGNATURE:
 *   applyMerges(grid, row, col)
 *     → { newGrid, pointsEarned, mergeLog[] }
 *
 *   mergeLog entry: { type, cellA, cellB, valueBefore, valueAfter }
 * =============================================================
 */

export function generateTileValue(level = 1) {
  const basePools = [
    [2, 3, 4, 6],
    [2, 3, 4, 6, 8, 9, 12],
    [2, 3, 4, 6, 8, 9, 12, 16, 18, 24],
    [2, 3, 4, 5, 6, 8, 9, 10, 12, 15, 16, 18, 20, 24, 25, 30, 32, 35, 36],
  ];
  const pool = basePools[Math.min(level - 1, basePools.length - 1)];
  return pool[Math.floor(Math.random() * pool.length)];
}

export function buildInitialQueue(level = 1, count = 3) {
  return Array.from({ length: count }, () => generateTileValue(level));
}

export function getAdjacent(row, col) {
  const directions = [
    { r: row - 1, c: col },
    { r: row + 1, c: col },
    { r: row, c: col - 1 },
    { r: row, c: col + 1 },
  ];

  return directions.filter(({ r, c }) => r >= 0 && r < 4 && c >= 0 && c < 4);
}

export function applyMerges(grid, row, col) {

  const g = grid.map(r => [...r]);
  let points = 0;
  const log = [];

  const dirty = [{ r: row, c: col }];
  const visited = new Set();


  const key = (r, c) => `${r},${c}`;


  while (dirty.length > 0) {
    const { r, c } = dirty.shift();
    const cellKey = key(r, c);


    if (g[r][c] == null) continue;

    const cellVal = g[r][c];
    const neighbors = getAdjacent(r, c);
    let merged = false;

    for (const { r: nr, c: nc } of neighbors) {
      const neighborVal = g[nr][nc];
      if (neighborVal == null) continue;

      if (cellVal === neighborVal) {

        log.push({
          type: 'equal',
          cellA: { r, c, value: cellVal },
          cellB: { r: nr, c: nc, value: neighborVal },
          result: null,
        });

        g[r][c] = null;
        g[nr][nc] = null;
        points += cellVal * 2;


        for (const adj of getAdjacent(r, c)) {
          if (g[adj.r][adj.c] != null) dirty.push(adj);
        }
        for (const adj of getAdjacent(nr, nc)) {
          if (g[adj.r][adj.c] != null) dirty.push(adj);
        }

        merged = true;
        break;
      }

      const larger = Math.max(cellVal, neighborVal);
      const smaller = Math.min(cellVal, neighborVal);

      if (larger % smaller === 0 && larger !== smaller) {
        const quotient = larger / smaller;


        const largerIsCell = cellVal >= neighborVal;
        const largerPos = largerIsCell ? { r, c } : { r: nr, c: nc };
        const smallerPos = largerIsCell ? { r: nr, c: nc } : { r, c };

        log.push({
          type: 'divide',
          cellA: { ...largerPos, value: larger },
          cellB: { ...smallerPos, value: smaller },
          result: quotient,
        });


        g[smallerPos.r][smallerPos.c] = null;

        g[largerPos.r][largerPos.c] = quotient;
        points += smaller * 2;


        if (quotient === 1) {
          log.push({
            type: 'remove-one',
            cellA: { ...largerPos, value: 1 },
            cellB: null,
            result: null,
          });
          g[largerPos.r][largerPos.c] = null;
          points += 5;


          for (const adj of getAdjacent(largerPos.r, largerPos.c)) {
            if (g[adj.r][adj.c] != null) dirty.push(adj);
          }
        } else {

          dirty.push(largerPos);
        }


        for (const adj of getAdjacent(smallerPos.r, smallerPos.c)) {
          if (g[adj.r][adj.c] != null) dirty.push(adj);
        }

        merged = true;
        break;
      }
    }

  }

  return {
    newGrid: g,
    pointsEarned: points,
    mergeLog: log,
  };
}

/**
 * getHintCells(grid, activeValue)
 * ──────────────────────────────
 * Checks every empty cell in the grid. If placing `activeValue` at that cell
 * would immediately trigger a merge (equal or divisible) with at least one
 * adjacent neighbor, that cell is a valid hint target.
 *
 * @param  {(number|null)[][]} grid
 * @param  {number} activeValue
 * @returns {boolean[][]} 4x4 boolean grid indicating which cells are hint targets
 */
export function getHintCells(grid, activeValue) {
  const hints = Array.from({ length: 4 }, () => Array(4).fill(false));
  if (activeValue == null) return hints;

  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (grid[r][c] == null) {
        const neighbors = getAdjacent(r, c);
        for (const { r: nr, c: nc } of neighbors) {
          const nv = grid[nr][nc];
          if (nv != null) {

            if (nv === activeValue) {
              hints[r][c] = true;
              break;
            }

            const larger = Math.max(nv, activeValue);
            const smaller = Math.min(nv, activeValue);
            if (larger % smaller === 0 && larger !== smaller) {
              hints[r][c] = true;
              break;
            }
          }
        }
      }
    }
  }
  return hints;
}
