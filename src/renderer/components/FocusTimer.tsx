import { useEffect, useRef, useState } from 'react';
import { FOCUS_DURATION_OPTIONS } from '../../shared/focus/validation';
import { useFocusSession } from '../hooks/useFocusSession';

export function FocusTimer(): JSX.Element {
  const {
    error,
    isLoading,
    displayTime,
    selectedDurationMinutes,
    isIdle,
    isRunning,
    isPaused,
    setDuration,
    start,
    pause,
    resume,
    stop,
  } = useFocusSession();

  const [isDurationMenuOpen, setIsDurationMenuOpen] = useState(false);
  const durationMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isDurationMenuOpen) {
      return undefined;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (
        durationMenuRef.current
        && !durationMenuRef.current.contains(event.target as Node)
      ) {
        setIsDurationMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [isDurationMenuOpen]);

  return (
    <section className="card focus-timer" aria-label="Focus timer">
      <h2 className="card-title">Focus Timer</h2>

      <div className="focus-timer-display-wrapper" ref={durationMenuRef}>
        {isIdle ? (
          <button
            type="button"
            className="focus-timer-display focus-timer-display-button"
            aria-label="Focus session duration"
            aria-haspopup="listbox"
            aria-expanded={isDurationMenuOpen}
            onClick={() => setIsDurationMenuOpen((open) => !open)}
          >
            {isLoading ? '--:--' : displayTime}
          </button>
        ) : (
          <p className="focus-timer-display" aria-label="Timer display" aria-live="polite">
            {isLoading ? '--:--' : displayTime}
          </p>
        )}

        {isIdle && isDurationMenuOpen ? (
          <ul className="focus-timer-duration-menu" role="listbox" aria-label="Select duration">
            {FOCUS_DURATION_OPTIONS.map((minutes) => (
              <li key={minutes} role="option" aria-selected={minutes === selectedDurationMinutes}>
                <button
                  type="button"
                  className={
                    minutes === selectedDurationMinutes
                      ? 'focus-timer-duration-option focus-timer-duration-option-selected'
                      : 'focus-timer-duration-option'
                  }
                  onClick={() => {
                    void setDuration(minutes);
                    setIsDurationMenuOpen(false);
                  }}
                >
                  {minutes} minutes
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {error ? (
        <p className="focus-timer-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="focus-timer-controls">
        {isIdle ? (
          <button type="button" className="focus-timer-button" onClick={() => void start()}>
            Start Focus Session
          </button>
        ) : null}

        {isRunning ? (
          <>
            <button type="button" className="focus-timer-button" onClick={() => void pause()}>
              Pause
            </button>
            <button
              type="button"
              className="focus-timer-button focus-timer-button-secondary"
              onClick={() => void stop()}
            >
              Stop
            </button>
          </>
        ) : null}

        {isPaused ? (
          <>
            <button type="button" className="focus-timer-button" onClick={() => void resume()}>
              Resume
            </button>
            <button
              type="button"
              className="focus-timer-button focus-timer-button-secondary"
              onClick={() => void stop()}
            >
              Stop
            </button>
          </>
        ) : null}
      </div>
    </section>
  );
}
