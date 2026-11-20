import type { Phase } from '../game/types';

interface OverlayProps {
  phase: Phase;
  score: number;
  highScore: number;
  onPlay: () => void;
  onResume: () => void;
}

export function Overlay({ phase, score, highScore, onPlay, onResume }: OverlayProps) {
  if (phase === 'playing') return null;

  if (phase === 'start') {
    return (
      <div className="overlay" role="dialog" aria-label="Start screen">
        <div className="panel">
          <p className="panel__eyebrow">Bismarck Big Boy Arcade</p>
          <h1 className="panel__title">
            BIG BOY
            <span>BURGER CATCH</span>
          </h1>
          <div className="panel__rules">
            <p>Catch burgers on Big Boy&apos;s plate for <strong>10 points</strong> each.</p>
            <p>Dodge the gravy! You have <strong>3 lives</strong>.</p>
            <p className="panel__small">Tap or hold the left and right controls, or use ← → keys.</p>
          </div>
          <button type="button" className="big-button" onClick={onPlay} autoFocus>
            PLAY GAME
          </button>
          <p className="panel__best">High score: <strong>{highScore}</strong></p>
        </div>
      </div>
    );
  }

  if (phase === 'paused') {
    return (
      <div className="overlay" role="dialog" aria-label="Paused">
        <div className="panel panel--compact">
          <h2 className="panel__heading">PAUSED</h2>
          <p className="panel__text">Take a breather. Your burgers will wait.</p>
          <button type="button" className="big-button" onClick={onResume} autoFocus>
            RESUME
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="overlay" role="dialog" aria-label="Game over">
      <div className="panel panel--compact">
        <p className="panel__eyebrow">Service is over</p>
        <h2 className="panel__heading">GAME OVER</h2>
        <div className="results">
          <div>
            <span>Final score</span>
            <strong data-testid="final-score">{score}</strong>
          </div>
          <div>
            <span>High score</span>
            <strong>{highScore}</strong>
          </div>
        </div>
        <button type="button" className="big-button" onClick={onPlay} autoFocus>
          PLAY AGAIN
        </button>
      </div>
    </div>
  );
}
