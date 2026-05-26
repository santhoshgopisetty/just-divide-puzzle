import React, { useState } from 'react';
import Tile from './Tile';

/**
 * SidePanel.jsx
 * -------------
 * The golden side strip with three interactive zones:
 *   1. KEEP slot  – drop a tile to store it; drag from KEEP back to grid
 *   2. Queue      – shows next 3 tiles; ONLY queue[0] is draggable
 *   3. TRASH slot – drop a tile to discard it (limited uses)
 *
 * Props:
 *   keepVal      – number | null  (the kept tile value)
 *   queue        – number[]       (upcoming tile values)
 *   trashCount   – number         (remaining trash uses)
 *   onKeepDrop   – callback(payload) when a tile is dropped on KEEP
 *   onTrashDrop  – callback(payload) when a tile is dropped on TRASH
 *
 * Drag sources:
 *   - queue[0]: draggable with source='queue'
 *   - keepVal (if present): draggable with source='keep'
 */

export default function SidePanel({
  keepVal,
  queue,
  trashCount,
  onKeepDrop,
  onTrashDrop,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  touchHover,
}) {
  const [keepHover, setKeepHover] = useState(false);
  const [trashHover, setTrashHover] = useState(false);

  /* ── KEEP drop handlers ──────────────────────────────── */
  const handleKeepDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setKeepHover(true);
  };

  const handleKeepDrop = (e) => {
    e.preventDefault();
    setKeepHover(false);
    try {
      const payload = JSON.parse(e.dataTransfer.getData('application/json'));
      if (onKeepDrop) onKeepDrop(payload);
    } catch {}
  };

  const handleKeepDragLeave = () => setKeepHover(false);

  /* ── TRASH drop handlers ─────────────────────────────── */
  const handleTrashDragOver = (e) => {
    if (trashCount <= 0) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setTrashHover(true);
  };

  const handleTrashDrop = (e) => {
    e.preventDefault();
    setTrashHover(false);
    try {
      const payload = JSON.parse(e.dataTransfer.getData('application/json'));
      if (onTrashDrop) onTrashDrop(payload);
    } catch {}
  };

  const handleTrashDragLeave = () => setTrashHover(false);

  const isKeepTouchHovered = touchHover && touchHover.type === 'keep';
  const isTrashTouchHovered = touchHover && touchHover.type === 'trash';

  return (
    <aside className="side-panel" id="side-panel" aria-label="Side panel">
      <div className="side-panel__strip">
        <div
          className="keep-slot"
          id="keep-slot"
          data-drop-target="keep"
          onDragOver={handleKeepDragOver}
          onDrop={handleKeepDrop}
          onDragLeave={handleKeepDragLeave}
        >
          <div className={`keep-slot__box ${keepHover || isKeepTouchHovered ? 'keep-slot__box--drop-target' : ''}`}>
            {keepVal != null ? (
              <Tile
                value={keepVal}
                isDraggable={true}
                dragData={{ value: keepVal, source: 'keep' }}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
              />
            ) : null}
          </div>
          <span className="keep-slot__label">Keep</span>
        </div>

        <div className="queue-section" id="queue-section" aria-label="Tile queue">
          {queue.map((val, i) => (
            <div className="queue-tile-wrapper" key={`q-${i}`}>
              <Tile
                value={val}
                isDraggable={i === 0}
                dragData={{ value: val, source: 'queue', index: i }}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
              />
            </div>
          ))}
        </div>

        <div
          className="trash-slot"
          id="trash-slot"
          data-drop-target="trash"
          onDragOver={handleTrashDragOver}
          onDrop={handleTrashDrop}
          onDragLeave={handleTrashDragLeave}
        >
          <span className="trash-slot__label">Trash</span>
          <div className={`trash-slot__box ${trashHover || isTrashTouchHovered ? 'trash-slot__box--drop-target' : ''}`}>
            <span className="trash-slot__icon">🗑️</span>
            <span className="trash-slot__count">×{trashCount}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
