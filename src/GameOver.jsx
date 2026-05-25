import React from 'react';

/**
 * GameOver.jsx
 * ------------
 * Full-screen overlay shown when the game ends.
 *
 * Props:
 *   score     – final score
 *   bestScore – all-time best
 *   level     – level reached
 *   onRestart – callback to reset the game
 */

export default function GameOver({ score, bestScore, level, onRestart }) {
  return (
    <div className="game-over-overlay" id="game-over" role="dialog" aria-modal="true">
      <div className="game-over-card">
        <h2>Game Over!</h2>
        <p>Level: <strong>{level}</strong></p>
        <p>Score: <strong>{score}</strong></p>
        <p>Best: <strong>{bestScore}</strong></p>
        <button id="btn-restart" onClick={onRestart}>
          Play Again
        </button>
      </div>
    </div>
  );
}
