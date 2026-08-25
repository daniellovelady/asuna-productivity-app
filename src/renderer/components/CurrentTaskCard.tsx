export function CurrentTaskCard(): JSX.Element {
  return (
    <section className="card current-task-card" aria-label="Current task">
      <h2 className="card-title">Current Task</h2>
      <dl className="task-details">
        <div className="task-detail">
          <dt>Title</dt>
          <dd>Build dashboard shell</dd>
        </div>
        <div className="task-detail">
          <dt>Priority</dt>
          <dd>High</dd>
        </div>
        <div className="task-detail">
          <dt>Status</dt>
          <dd>In Progress</dd>
        </div>
      </dl>
    </section>
  );
}
