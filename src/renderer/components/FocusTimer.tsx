export function FocusTimer(): JSX.Element {
  return (
    <section className="card focus-timer" aria-label="Focus timer">
      <h2 className="card-title">Focus Timer</h2>
      <p className="focus-timer-display" aria-label="Timer display">
        25:00
      </p>
      <button type="button" className="focus-timer-button">
        Start Focus Session
      </button>
    </section>
  );
}
