import { useTasks } from '../hooks/useTasks';
import { TASK_PRIORITY_LABELS } from '../types/task';

function formatStatus(status: string): string {
  return status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function CurrentTaskCard(): JSX.Element {
  const { selectedTask } = useTasks();

  return (
    <section className="card current-task-card" aria-label="Current task">
      <h2 className="card-title">Current Task</h2>
      {selectedTask ? (
        <dl className="task-details">
          <div className="task-detail">
            <dt>Title</dt>
            <dd>{selectedTask.title}</dd>
          </div>
          {selectedTask.description ? (
            <div className="task-detail">
              <dt>Description</dt>
              <dd>{selectedTask.description}</dd>
            </div>
          ) : null}
          <div className="task-detail">
            <dt>Priority</dt>
            <dd>{TASK_PRIORITY_LABELS[selectedTask.priority]}</dd>
          </div>
          <div className="task-detail">
            <dt>Status</dt>
            <dd>{formatStatus(selectedTask.status)}</dd>
          </div>
        </dl>
      ) : (
        <p className="task-panel-message">No task selected</p>
      )}
    </section>
  );
}
