import React, { useState, useEffect, useCallback } from 'react';
import Header from './Header';
import GameBoard from './GameBoard';
import SidePanel from './SidePanel';
import GameOver from './GameOver';
import Tile from './Tile';
import { buildInitialQueue, generateTileValue, applyMerges, getHintCells } from './mergeLogic';

/**
 * App.jsx
 * -------
 * Root component – ALL game state lives here.
 * Provides touch drag-and-drop support, leveling, hints, keyboard shortcuts,
 * undo capabilities, and multiple difficulty levels.
 */

function createEmptyGrid() {
  return Array.from({ length: 4 }, () => Array(4).fill(null));
}

function loadBestScore() {
  try {
    const saved = localStorage.getItem('justdivide_best');
    return saved ? parseInt(saved, 10) : 0;
  } catch {
    return 0;
  }
}

/**
 * advanceQueue
 * ────────────
 * Removes the first tile from the queue and appends a new random one.
 * This keeps the queue always at 3 tiles.
 */
function advanceQueue(queue, level) {
  const next = [...queue.slice(1), generateTileValue(level)];
  return next;
}

/**
 * checkGameOver
 * ─────────────
 * The game ends when every cell in the grid is occupied.
 */
function checkGameOver(grid) {
  return grid.every(row => row.every(cell => cell != null));
}

export default function App() {
  /* ── State ────────────────────────────────────────────── */
  const [grid, setGrid] = useState(createEmptyGrid);
  const [queue, setQueue] = useState(() => buildInitialQueue(1, 3));
  const [keepVal, setKeepVal] = useState(null);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(loadBestScore);
  const [undoStack, setUndoStack] = useState([]);
  const [level, setLevel] = useState(1);
  const [trashCount, setTrashCount] = useState(10);
  const [hintsEnabled, setHintsEnabled] = useState(false);
  const [timer, setTimer] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [difficulty, setDifficulty] = useState('Easy'); // 'Easy' | 'Medium' | 'Hard'

  // Touch drag-and-drop state
  const [touchDrag, setTouchDrag] = useState(null); // { value, source, x, y }
  const [touchHover, setTouchHover] = useState(null); // { type: 'grid-cell'|'keep'|'trash', r?, c? }

  /* ── Timer ────────────────────────────────────────────── */
  useEffect(() => {
    if (gameOver) return;
    const id = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [gameOver]);

  /* ── Persist best score ───────────────────────────────── */
  useEffect(() => {
    if (score > bestScore) {
      setBestScore(score);
      try {
        localStorage.setItem('justdivide_best', String(score));
      } catch {}
    }
  }, [score, bestScore]);

  /* ── Leveling System ──────────────────────────────────── */
  useEffect(() => {
    const newLevel = Math.floor(score / 10) + 1;
    if (newLevel > level) {
      setLevel(newLevel);
    }
  }, [score, level]);

  /* ── Save snapshot for undo before every move ─────────── */
  const saveUndo = useCallback(() => {
    setUndoStack(prev => [
      ...prev.slice(-9), // keep last 10 snapshots max
      {
        grid: grid.map(r => [...r]),
        queue: [...queue],
        keepVal,
        score,
        trashCount,
        level,
      },
    ]);
  }, [grid, queue, keepVal, score, trashCount, level]);

  /* ── Undo Action ──────────────────────────────────────── */
  const handleUndo = useCallback(() => {
    if (gameOver) return;
    if (undoStack.length === 0) return;

    const nextStack = [...undoStack];
    const snapshot = nextStack.pop();

    setUndoStack(nextStack);
    setGrid(snapshot.grid);
    setQueue(snapshot.queue);
    setKeepVal(snapshot.keepVal);
    setScore(snapshot.score);
    setTrashCount(snapshot.trashCount);
    if (snapshot.level !== undefined) {
      setLevel(snapshot.level);
    }
  }, [undoStack, gameOver]);

  /* ── Drop handlers ────────────────────────────────────── */
  const handleCellDrop = useCallback((row, col, payload) => {
    if (gameOver) return;
    if (grid[row][col] != null) return; // cell occupied

    saveUndo();

    // 1. Place tile on grid
    const placedGrid = grid.map(r => [...r]);
    placedGrid[row][col] = payload.value;

    // 2. Run merge engine
    const { newGrid, pointsEarned, mergeLog } = applyMerges(placedGrid, row, col);

    if (mergeLog.length > 0) {
      console.log('🧮 Merges:', mergeLog);
    }

    setGrid(newGrid);

    // 3. Remove from source
    if (payload.source === 'queue') {
      setQueue(prev => advanceQueue(prev, level));
    } else if (payload.source === 'keep') {
      setKeepVal(null);
    }

    // 4. Update Score
    setScore(prevScore => prevScore + pointsEarned);

    // 5. Game over check
    if (checkGameOver(newGrid)) {
      setGameOver(true);
    }
  }, [gameOver, grid, level, saveUndo]);

  const handleKeepDrop = useCallback((payload) => {
    if (gameOver) return;
    if (payload.source === 'keep') return; // no swap to same slot

    saveUndo();

    if (keepVal == null) {
      // Empty KEEP
      setKeepVal(payload.value);
    } else {
      // Occupied KEEP → swap
      setQueue(prev => {
        const advanced = advanceQueue(prev, level);
        return [keepVal, ...advanced.slice(0, 2)];
      });
      setKeepVal(payload.value);
      return;
    }

    // Advance queue (if we dragged from queue)
    if (payload.source === 'queue') {
      setQueue(prev => advanceQueue(prev, level));
    }
  }, [gameOver, keepVal, level, saveUndo]);

  const handleTrashDrop = useCallback((payload) => {
    if (gameOver) return;
    if (trashCount <= 0) return;

    saveUndo();

    setTrashCount(tc => tc - 1);

    if (payload.source === 'queue') {
      setQueue(prev => advanceQueue(prev, level));
    } else if (payload.source === 'keep') {
      setKeepVal(null);
    }
  }, [gameOver, trashCount, level, saveUndo]);

  /* ── Restart & Difficulty ────────────────────────────── */
  const handleRestartWithDifficulty = useCallback((diff) => {
    let startLevel = 1;
    let startTrash = 10;
    if (diff === 'Medium') {
      startLevel = 2;
      startTrash = 6;
    } else if (diff === 'Hard') {
      startLevel = 3;
      startTrash = 3;
    }

    setGrid(createEmptyGrid());
    setQueue(buildInitialQueue(startLevel, 3));
    setKeepVal(null);
    setScore(0);
    setUndoStack([]);
    setLevel(startLevel);
    setTrashCount(startTrash);
    setHintsEnabled(false);
    setTimer(0);
    setGameOver(false);
  }, []);

  const handleRestart = useCallback(() => {
    handleRestartWithDifficulty(difficulty);
  }, [difficulty, handleRestartWithDifficulty]);

  /* ── Keyboard Shortcuts ───────────────────────────────── */
  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      if (key === 'z') {
        handleUndo();
      } else if (key === 'r') {
        handleRestart();
      } else if (key === 'g') {
        setHintsEnabled(prev => !prev);
      } else if (e.key === '1') {
        setDifficulty('Easy');
        handleRestartWithDifficulty('Easy');
      } else if (e.key === '2') {
        setDifficulty('Medium');
        handleRestartWithDifficulty('Medium');
      } else if (e.key === '3') {
        setDifficulty('Hard');
        handleRestartWithDifficulty('Hard');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRestart, handleRestartWithDifficulty]);

  /* ── Touch Event Handlers ─────────────────────────────── */
  const handleTouchStart = useCallback((dragData, clientX, clientY) => {
    if (gameOver) return;
    setTouchDrag({
      value: dragData.value,
      source: dragData.source,
      x: clientX,
      y: clientY,
    });
  }, [gameOver]);

  const handleTouchMove = useCallback((clientX, clientY) => {
    if (!touchDrag) return;
    setTouchDrag(prev => (prev ? { ...prev, x: clientX, y: clientY } : null));

    // Determine target drop zone
    const el = document.elementFromPoint(clientX, clientY);
    const target = el?.closest('[data-drop-target]');
    if (target) {
      const type = target.getAttribute('data-drop-target');
      if (type === 'grid-cell') {
        const r = parseInt(target.getAttribute('data-row'), 10);
        const c = parseInt(target.getAttribute('data-col'), 10);
        if (grid[r][c] == null) {
          setTouchHover({ type: 'grid-cell', r, c });
        } else {
          setTouchHover(null);
        }
      } else if (type === 'keep') {
        if (touchDrag.source === 'keep') {
          setTouchHover(null);
        } else {
          setTouchHover({ type: 'keep' });
        }
      } else if (type === 'trash') {
        if (trashCount > 0) {
          setTouchHover({ type: 'trash' });
        } else {
          setTouchHover(null);
        }
      } else {
        setTouchHover(null);
      }
    } else {
      setTouchHover(null);
    }
  }, [touchDrag, grid, trashCount]);

  const handleTouchEnd = useCallback((clientX, clientY) => {
    if (!touchDrag) return;

    const val = touchDrag.value;
    const src = touchDrag.source;

    setTouchDrag(null);
    setTouchHover(null);

    const el = document.elementFromPoint(clientX, clientY);
    const target = el?.closest('[data-drop-target]');
    if (target) {
      const type = target.getAttribute('data-drop-target');
      const payload = { value: val, source: src };

      if (type === 'grid-cell') {
        const r = parseInt(target.getAttribute('data-row'), 10);
        const c = parseInt(target.getAttribute('data-col'), 10);
        if (grid[r][c] == null) {
          handleCellDrop(r, c, payload);
        }
      } else if (type === 'keep') {
        if (src !== 'keep') {
          handleKeepDrop(payload);
        }
      } else if (type === 'trash') {
        if (trashCount > 0) {
          handleTrashDrop(payload);
        }
      }
    }
  }, [touchDrag, grid, trashCount, handleCellDrop, handleKeepDrop, handleTrashDrop]);

  /* ── Hints ────────────────────────────────────────────── */
  // Determine which tile is active for hinting (the floating touch tile or the top queue tile)
  const activeValueForHints = touchDrag ? touchDrag.value : queue[0];
  const hintCells = (hintsEnabled && activeValueForHints != null)
    ? getHintCells(grid, activeValueForHints)
    : null;

  return (
    <div className="app-wrapper">
      <Header
        timer={timer}
        level={level}
        score={score}
        difficulty={difficulty}
        hintsEnabled={hintsEnabled}
        canUndo={undoStack.length > 0}
        onUndo={handleUndo}
        onRestart={handleRestart}
        onToggleHints={() => setHintsEnabled(p => !p)}
        onSelectDifficulty={(diff) => {
          setDifficulty(diff);
          handleRestartWithDifficulty(diff);
        }}
      />

      <div className="game-layout">
        <GameBoard
          grid={grid}
          hintCells={hintCells}
          touchHover={touchHover}
          onCellDrop={handleCellDrop}
        />
        <SidePanel
          keepVal={keepVal}
          queue={queue}
          trashCount={trashCount}
          onKeepDrop={handleKeepDrop}
          onTrashDrop={handleTrashDrop}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          touchHover={touchHover}
        />
      </div>

      {gameOver && (
        <GameOver
          score={score}
          bestScore={bestScore}
          level={level}
          onRestart={handleRestart}
        />
      )}

      {/* Floating tile during touch dragging */}
      {touchDrag && (
        <div
          className="touch-drag-floating"
          style={{
            left: `${touchDrag.x}px`,
            top: `${touchDrag.y}px`,
          }}
        >
          <Tile value={touchDrag.value} />
        </div>
      )}
    </div>
  );
}
