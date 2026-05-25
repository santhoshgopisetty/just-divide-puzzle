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

// ── Tile Generation ──────────────────────────────────────────

/**
 * Generate a random tile value appropriate for the given level.
 * Lower levels produce smaller, friendlier numbers.
 */
export function generateTileValue(level = 1) {
  const basePools = [
    [2, 3, 4, 6],                          // Level 1
    [2, 3, 4, 6, 8, 9, 12],                // Level 2
    [2, 3, 4, 6, 8, 9, 12, 16, 18, 24],    // Level 3
    [2, 3, 4, 5, 6, 8, 9, 10, 12, 15, 16, 18, 20, 24, 25, 30, 32, 35, 36], // Level 4+
  ];
  const pool = basePools[Math.min(level - 1, basePools.length - 1)];
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Build an initial queue of `count` tiles for the given level.
 */
export function buildInitialQueue(level = 1, count = 3) {
  return Array.from({ length: count }, () => generateTileValue(level));
}

// ── Adjacency Helper ─────────────────────────────────────────

/**
 * getAdjacent(row, col)
 * ─────────────────────
 * Returns an array of {r, c} objects for the 4 cardinal neighbors
 * that are within the 4×4 grid bounds.
 *
 * Example: getAdjacent(0, 0) → [{r:1,c:0}, {r:0,c:1}]
 *          (top-left corner has only DOWN and RIGHT)
 *
 *          getAdjacent(2, 2) → [{r:1,c:2}, {r:3,c:2}, {r:2,c:1}, {r:2,c:3}]
 *          (center cell has all 4 neighbors)
 */
export function getAdjacent(row, col) {
  const directions = [
    { r: row - 1, c: col },   // UP
    { r: row + 1, c: col },   // DOWN
    { r: row, c: col - 1 },   // LEFT
    { r: row, c: col + 1 },   // RIGHT
  ];
  // Filter out positions that fall outside the 4×4 grid
  return directions.filter(({ r, c }) => r >= 0 && r < 4 && c >= 0 && c < 4);
}

// ── Core Merge Engine ────────────────────────────────────────

/**
 * applyMerges(grid, row, col)
 * ───────────────────────────
 * After placing a tile at grid[row][col], check all adjacent cells
 * and apply merge rules. Supports chain reactions.
 *
 * @param  {(number|null)[][]} grid - The 4×4 grid (will NOT be mutated)
 * @param  {number} row   - Row of the newly placed tile
 * @param  {number} col   - Column of the newly placed tile
 * @returns {{ newGrid: (number|null)[][], pointsEarned: number, mergeLog: object[] }}
 *
 * ── Algorithm Walkthrough ──
 *
 * 1. Deep-clone the grid so we never mutate the original.
 *
 * 2. Put the placed cell (row, col) into a "dirty set" — cells that
 *    need their neighbors checked.
 *
 * 3. While the dirty set is non-empty:
 *    a. Pop a cell (r, c) from the set.
 *    b. If grid[r][c] is null, skip (already cleared).
 *    c. For each adjacent neighbor (nr, nc):
 *       - Skip if neighbor is null.
 *       - EQUAL check:  grid[r][c] === grid[nr][nc]
 *            → Both cells become null.
 *            → Points += value × 2.
 *            → Log the merge.
 *            → Mark all neighbors of BOTH cleared cells as dirty.
 *            → Break (this cell is gone, stop checking its neighbors).
 *       - DIVISIBLE check: can the larger be divided by the smaller?
 *            → larger % smaller === 0
 *            → The larger cell becomes (larger ÷ smaller).
 *            → The smaller cell becomes null.
 *            → Points += smaller × 2.
 *            → If the quotient is 1, remove that tile too (+5 bonus).
 *            → Log the merge.
 *            → Mark the changed/cleared cells' neighbors as dirty.
 *            → Break (re-check this cell's new value from scratch).
 *
 * 4. Return { newGrid, pointsEarned, mergeLog }.
 */
export function applyMerges(grid, row, col) {
  // 1. Deep clone
  const g = grid.map(r => [...r]);
  let points = 0;
  const log = [];

  // 2. Dirty set — cells whose neighbors need checking
  //    Using a simple array as a queue (BFS-style)
  const dirty = [{ r: row, c: col }];
  const visited = new Set(); // prevent infinite loops on the same cell

  // Helper: create a unique key for a cell
  const key = (r, c) => `${r},${c}`;

  // 3. Process dirty cells
  while (dirty.length > 0) {
    const { r, c } = dirty.shift();
    const cellKey = key(r, c);

    // Skip if we already processed this cell in this pass
    // (we clear visited when a merge happens to allow re-checking)
    if (g[r][c] == null) continue;

    const cellVal = g[r][c];
    const neighbors = getAdjacent(r, c);
    let merged = false;

    for (const { r: nr, c: nc } of neighbors) {
      const neighborVal = g[nr][nc];
      if (neighborVal == null) continue;

      // ── Rule 1: EQUAL ──────────────────────────────────
      if (cellVal === neighborVal) {
        // Both tiles vanish
        log.push({
          type: 'equal',
          cellA: { r, c, value: cellVal },
          cellB: { r: nr, c: nc, value: neighborVal },
          result: null,
        });

        g[r][c] = null;
        g[nr][nc] = null;
        points += cellVal * 2;

        // Mark neighbors of BOTH cleared cells as dirty
        for (const adj of getAdjacent(r, c)) {
          if (g[adj.r][adj.c] != null) dirty.push(adj);
        }
        for (const adj of getAdjacent(nr, nc)) {
          if (g[adj.r][adj.c] != null) dirty.push(adj);
        }

        merged = true;
        break; // cell is gone, stop checking its neighbors
      }

      // ── Rule 2: DIVISIBLE ──────────────────────────────
      const larger = Math.max(cellVal, neighborVal);
      const smaller = Math.min(cellVal, neighborVal);

      if (larger % smaller === 0 && larger !== smaller) {
        const quotient = larger / smaller;

        // Determine which cell has the larger vs smaller value
        const largerIsCell = cellVal >= neighborVal;
        const largerPos = largerIsCell ? { r, c } : { r: nr, c: nc };
        const smallerPos = largerIsCell ? { r: nr, c: nc } : { r, c };

        log.push({
          type: 'divide',
          cellA: { ...largerPos, value: larger },
          cellB: { ...smallerPos, value: smaller },
          result: quotient,
        });

        // Smaller vanishes
        g[smallerPos.r][smallerPos.c] = null;
        // Larger becomes quotient
        g[largerPos.r][largerPos.c] = quotient;
        points += smaller * 2;

        // ── Rule 3: RESULT IS 1 → remove ────────────────
        if (quotient === 1) {
          log.push({
            type: 'remove-one',
            cellA: { ...largerPos, value: 1 },
            cellB: null,
            result: null,
          });
          g[largerPos.r][largerPos.c] = null;
          points += 5; // bonus for cleaning a "1"

          // Mark neighbors of the cleared cell as dirty
          for (const adj of getAdjacent(largerPos.r, largerPos.c)) {
            if (g[adj.r][adj.c] != null) dirty.push(adj);
          }
        } else {
          // The quotient cell might trigger new merges → dirty
          dirty.push(largerPos);
        }

        // Mark neighbors of the cleared smaller cell as dirty
        for (const adj of getAdjacent(smallerPos.r, smallerPos.c)) {
          if (g[adj.r][adj.c] != null) dirty.push(adj);
        }

        merged = true;
        break; // re-process from dirty queue
      }
    }
    // If no merge happened for this cell, nothing to do — move on
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
            // Rule 1: Equal
            if (nv === activeValue) {
              hints[r][c] = true;
              break;
            }
            // Rule 2: Divisible
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
