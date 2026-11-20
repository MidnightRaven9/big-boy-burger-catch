import type { PointerEvent } from 'react';
import type { Direction } from '../game/types';

interface ControlsProps {
  disabled: boolean;
  onDirection: (direction: Direction, active: boolean) => void;
  onInteract: () => void;
}

export function Controls({ disabled, onDirection, onInteract }: ControlsProps) {
  const start = (direction: Direction) => (event: PointerEvent<HTMLButtonElement>) => {
    if (disabled) return;
    event.preventDefault();
    onInteract();
    event.currentTarget.setPointerCapture(event.pointerId);
    onDirection(direction, true);
  };

  const end = (direction: Direction) => (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    onDirection(direction, false);
  };

  return (
    <div className="controls" aria-label="Movement controls">
      <button
        type="button"
        className="control control--left"
        aria-label="Move left"
        disabled={disabled}
        onPointerDown={start('left')}
        onPointerUp={end('left')}
        onPointerCancel={end('left')}
        onLostPointerCapture={() => onDirection('left', false)}
        onContextMenu={(event) => event.preventDefault()}
      >
        <span className="control__arrow" aria-hidden="true">◀</span>
        <span className="control__label">LEFT</span>
      </button>
      <div className="controls__hint" aria-hidden="true">TAP &amp; HOLD TO MOVE</div>
      <button
        type="button"
        className="control control--right"
        aria-label="Move right"
        disabled={disabled}
        onPointerDown={start('right')}
        onPointerUp={end('right')}
        onPointerCancel={end('right')}
        onLostPointerCapture={() => onDirection('right', false)}
        onContextMenu={(event) => event.preventDefault()}
      >
        <span className="control__arrow" aria-hidden="true">▶</span>
        <span className="control__label">RIGHT</span>
      </button>
    </div>
  );
}
