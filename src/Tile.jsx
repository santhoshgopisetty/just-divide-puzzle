import React from 'react';

/**
 * Tile.jsx
 * --------
 * Renders a single numbered tile with a colored background image.
 *
 * Props:
 *   value       – the number to display (e.g. 4, 12, 35)
 *   isNew       – optional: plays pop animation
 *   isDraggable – optional: makes the tile draggable via HTML5 DnD
 *   onDragStart – optional: callback when drag begins
 *   dragData    – optional: data payload to attach to the drag event
 *
 * Color mapping (by value range):
 *   1-6   → blue
 *   7-12  → orange
 *   13-18 → pink
 *   19-24 → purple
 *   25+   → red
 */

function getTileColor(value) {
  if (value <= 6) return 'blue';
  if (value <= 12) return 'orange';
  if (value <= 18) return 'pink';
  if (value <= 24) return 'purple';
  return 'red';
}

export default function Tile({
  value,
  isNew = false,
  isDraggable = false,
  onDragStart,
  dragData,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
}) {
  if (value == null) return null;

  const color = getTileColor(value);
  const classNames = [
    'tile',
    `tile--${color}`,
    isNew ? 'tile--new' : '',
    isDraggable ? 'tile--draggable' : '',
  ].filter(Boolean).join(' ');

  const handleDragStart = (e) => {
    if (!isDraggable) return;


    const payload = JSON.stringify(dragData || { value });
    e.dataTransfer.setData('application/json', payload);
    e.dataTransfer.effectAllowed = 'move';


    requestAnimationFrame(() => {
      e.target.classList.add('tile--dragging');
    });

    if (onDragStart) onDragStart(e, dragData);
  };

  const handleDragEnd = (e) => {
    e.target.classList.remove('tile--dragging');
  };

  const handleTouchStart = (e) => {
    if (!isDraggable) return;
    const touch = e.touches[0];
    if (onTouchStart) {
      onTouchStart(dragData || { value, source: 'queue' }, touch.clientX, touch.clientY);
    }
  };

  const handleTouchMove = (e) => {
    if (!isDraggable) return;
    const touch = e.touches[0];
    if (onTouchMove) {
      onTouchMove(touch.clientX, touch.clientY);
    }
  };

  const handleTouchEnd = (e) => {
    if (!isDraggable) return;
    const touch = e.changedTouches[0];
    if (onTouchEnd) {
      onTouchEnd(touch.clientX, touch.clientY);
    }
  };

  return (
    <div
      className={classNames}
      draggable={isDraggable}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <img
        className="tile__bg"
        src={`${import.meta.env.BASE_URL}assets/${color === 'purple' ? 'purpule' : color}.png`}
        alt=""
        draggable={false}
      />
      <span className="tile__number">{value}</span>
    </div>
  );
}
