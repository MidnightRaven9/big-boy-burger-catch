import type { Phase } from '../game/types';

interface HudProps {
  phase: Phase;
  score: number;
  highScore: number;
  lives: number;
  level: number;
  muted: boolean;
  onPause: () => void;
  onResume: () => void;
  onMute: () => void;
}

export function Hud({
  phase,
  score,
  highScore,
  lives,
  level,
  muted,
  onPause,
  onResume,
  onMute,
}: HudProps) {
  const isPlaying = phase === 'playing';
  const isPaused = phase === 'paused';

  return (
    <header className="hud" aria-label="Game status">
      <div className="hud__stats">
        <div className="hud__stat">
          <span className="hud__label">Score</span>
          <strong className="hud__value" data-testid="score">{score}</strong>
        </div>
        <div className="hud__stat hud__stat--level">
          <span className="hud__label">Level</span>
          <strong className="hud__value hud__value--level" data-testid="level">{level}</strong>
        </div>
        <div className="hud__stat hud__stat--center">
          <span className="hud__label">Best</span>
          <strong className="hud__value" data-testid="high-score">{highScore}</strong>
        </div>
        <div className="hud__stat hud__stat--lives">
          <span className="hud__label">Lives</span>
          <div className="hearts" data-testid="lives" aria-label={`${lives} lives remaining`}>
            {[0, 1, 2].map((i) => (
              <Heart key={i} filled={i < lives} />
            ))}
          </div>
        </div>
      </div>
      <div className="hud__buttons">
        {isPlaying || isPaused ? (
          <button
            type="button"
            className="icon-button"
            onClick={isPaused ? onResume : onPause}
            aria-label={isPaused ? 'Resume game' : 'Pause game'}
          >
            {isPaused ? '▶' : '❚❚'}
          </button>
        ) : null}
        <button
          type="button"
          className="icon-button"
          onClick={onMute}
          aria-label={muted ? 'Unmute sound' : 'Mute sound'}
          aria-pressed={muted}
        >
          {muted ? '🔇' : '🔊'}
        </button>
      </div>
    </header>
  );
}

function Heart({ filled }: { filled: boolean }) {
  return (
    <svg
      className={`heart ${filled ? 'heart--full' : 'heart--empty'}`}
      viewBox="0 0 32 29"
      aria-hidden="true"
    >
      <path d="M16 28.5C13.2 26.3 2 18.2 2 10.1 2 5.1 5.8 1.5 10.3 1.5c2.8 0 4.9 1.4 5.7 3.2.8-1.8 2.9-3.2 5.7-3.2C26.2 1.5 30 5.1 30 10.1c0 8.1-11.2 16.2-14 18.4z" />
    </svg>
  );
}
