import React, { useState } from 'react';
import Tile from './Tile';

/**
 * GameBoard.jsx
 * -------------
 * Renders the 4×4 grid with the cat mascot on top.
 * Each cell is a drop target for tiles from the queue or KEEP slot.
 *
 * Props:
 *   grid       – 4×4 2D array: grid[row][col] = number | null
 *   onCellDrop – callback(row, col, dragPayload) when a tile is dropped on a cell
 *
 * Drop behavior:
 *   - Only EMPTY cells accept drops (occupied cells reject)
 *   - On dragOver: cell gets a highlight glow
 *   - On drop: calls onCellDrop with the cell coordinates and payload
 */

export default function GameBoard({ grid, onCellDrop, hintCells, touchHover }) {
  // Track which cell is currently being hovered during drag
  const [hoverCell, setHoverCell] = useState(null);

  /**
   * handleDragOver
   * ──────────────
   * Called continuously while a dragged item hovers over a cell.
   * We must call e.preventDefault() to signal that this is a valid drop target.
   * We only allow drops on empty cells.
   */
  const handleDragOver = (e, r, c) => {
    if (grid[r][c] != null) return; // occupied → reject
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setHoverCell(`${r}-${c}`);
  };

  /**
   * handleDrop
   * ──────────
   * Called when the user releases the dragged tile over a valid cell.
   * 1. Parse the JSON payload from dataTransfer
   * 2. Call the parent's onCellDrop callback with (row, col, payload)
   * 3. Clear the hover highlight
   */
  const handleDrop = (e, r, c) => {
    e.preventDefault();
    setHoverCell(null);

    try {
      const payload = JSON.parse(e.dataTransfer.getData('application/json'));
      if (onCellDrop) onCellDrop(r, c, payload);
    } catch {
      // Invalid payload — ignore
    }
  };

  const handleDragLeave = () => {
    setHoverCell(null);
  };

  return (
    <div className="board-wrapper" id="game-board">
      {/* Cat mascot peeking over the board */}
      <img
        className="cat-mascot"
        src="/assets/Cat.png"
        alt="Cat mascot"
        draggable={false}
      />

      <div className="board" role="grid" aria-label="4 by 4 game grid">
        {grid.map((row, r) =>
          row.map((cellValue, c) => {
            const isTouchHovered =
              touchHover &&
              touchHover.type === 'grid-cell' &&
              touchHover.r === r &&
              touchHover.c === c;
            const isHovered = (hoverCell === `${r}-${c}` || isTouchHovered) && cellValue == null;
            const isHint = hintCells && hintCells[r][c] && cellValue == null;

            return (
              <div
                key={`${r}-${c}`}
                className={`cell ${isHovered ? 'cell--drop-target' : ''} ${isHint ? 'cell--hint' : ''}`}
                id={`cell-${r}-${c}`}
                data-drop-target="grid-cell"
                data-row={r}
                data-col={c}
                role="gridcell"
                aria-label={
                  cellValue != null
                    ? `Row ${r + 1}, Column ${c + 1}: ${cellValue}`
                    : `Row ${r + 1}, Column ${c + 1}: empty`
                }
                onDragOver={(e) => handleDragOver(e, r, c)}
                onDrop={(e) => handleDrop(e, r, c)}
                onDragLeave={handleDragLeave}
              >
                {cellValue != null && <Tile value={cellValue} />}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
