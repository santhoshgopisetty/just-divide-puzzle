import React from 'react';

/**
 * Header.jsx
 * ----------
 * Displays the game title, timer, instruction text,
 * pause/help buttons, and Level + Score badges.
 *
 * Props:
 *   timer  – elapsed seconds (number)
 *   level  – current level (number)
 *   score  – current score (number)
 */

function formatTime(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export default function Header({
  timer,
  level,
  score,
  difficulty,
  hintsEnabled,
  canUndo,
  onUndo,
  onRestart,
  onToggleHints,
  onSelectDifficulty,
}) {
  return (
    <header className="header" id="header">
      <div className="header__top-row">
        <button
          className="header__btn header__btn--pause"
          id="btn-pause"
          onClick={onRestart}
          aria-label="Restart game"
          title="Restart (R)"
        >
          🔄
        </button>

        <h1 className="header__title">Just Divide</h1>

        <button
          className="header__btn header__btn--help"
          id="btn-help"
          aria-label="How to play"
          title="Help"
          onClick={() => {
            alert(
              "HOW TO PLAY:\n\n" +
                "1. Drag tiles from the queue or the KEEP slot to empty grid cells.\n" +
                "2. When two adjacent tiles have equal values, they both vanish (Score: value x 2).\n" +
                "3. When one adjacent tile divides another evenly, the larger is replaced by the division result and the smaller is removed (Score: smaller x 2).\n" +
                "4. If a division results in 1, that tile is also removed (Bonus: +5 points).\n" +
                "5. Try to level up by getting points! Every 10 points levels you up and grants +3 trash uses.\n" +
                "6. Use the TRASH slot to discard unwanted tiles from the queue or keep slot.\n\n" +
                "Keyboard Shortcuts:\n" +
                "- Z: Undo\n" +
                "- R: Restart\n" +
                "- G: Toggle Hints\n" +
                "- 1, 2, 3: Set Difficulty (Easy, Medium, Hard)"
            );
          }}
        >
          ?
        </button>
      </div>

      <div className="header__timer" id="timer-display">
        <span className="header__timer-icon">⏳</span>
        <span>{formatTime(timer)}</span>
      </div>

      <p className="header__instruction">
        Divide with the numbers to solve the rows and columns.
      </p>

      {/* Cat mascot + Badges are positioned here visually but
          the cat is rendered inside GameBoard for proper layering */}

      <div className="header__badges" id="badges">
        <div className="badge" id="badge-level">
          <img
            className="badge__img"
            src={`${import.meta.env.BASE_URL}assets/Levels and Score.png`}
            alt=""
          />
          <span className="badge__text">Level {level}</span>
        </div>
        <div className="badge" id="badge-score">
          <img
            className="badge__img"
            src={`${import.meta.env.BASE_URL}assets/Levels and Score.png`}
            alt=""
          />
          <span className="badge__text">Score {score}</span>
        </div>
      </div>

      <div className="header__controls">
        <button
          className={`control-btn ${hintsEnabled ? 'active' : ''}`}
          onClick={onToggleHints}
          title="Toggle hints (G)"
        >
          💡 Hints: {hintsEnabled ? 'ON' : 'OFF'}
        </button>
        <button
          className="control-btn"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo move (Z)"
        >
          ↩️ Undo
        </button>
        <div className="difficulty-selector">
          <button
            className={`diff-btn ${difficulty === 'Easy' ? 'active' : ''}`}
            onClick={() => onSelectDifficulty('Easy')}
            title="Easy mode (1)"
          >
            Easy
          </button>
          <button
            className={`diff-btn ${difficulty === 'Medium' ? 'active' : ''}`}
            onClick={() => onSelectDifficulty('Medium')}
            title="Medium mode (2)"
          >
            Medium
          </button>
          <button
            className={`diff-btn ${difficulty === 'Hard' ? 'active' : ''}`}
            onClick={() => onSelectDifficulty('Hard')}
            title="Hard mode (3)"
          >
            Hard
          </button>
        </div>
      </div>
    </header>
  );
}
