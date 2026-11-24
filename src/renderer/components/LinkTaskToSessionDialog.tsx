import { useState } from 'react';
import type { EndedSession } from '../types/focusSession';
import type { Task } from '../types/task';
import { SessionAttributionError, setSessionTaskAttribution } from '../services/sessionAttributionService';

type LinkTaskToSessionDialogProps = {
  session: EndedSession;
  tasks: Task[];
  tasksLoadStatus: 'idle' | 'loading' | 'success' | 'error';
  tasksLoadError: string | null;
  onClose: () => void;
  onLinked: () => void;
  onRetryLoadTasks: () => void;
};

export function LinkTaskToSessionDialog({
  session,
  tasks,
  tasksLoadStatus,
  tasksLoadError,
  onClose,
  onLinked,
  onRetryLoadTasks,
}: LinkTaskToSessionDialogProps): JSX.Element {
  const [selectedTaskId, setSelectedTaskId] = useState(session.taskId ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const tasksLoading = tasksLoadStatus === 'loading' || tasksLoadStatus === 'idle';
  const tasksFailed = tasksLoadStatus === 'error';
  const title = session.taskId ? 'Change task for session' : 'Link task to session';

  const handleSubmit = async () => {
    if (!selectedTaskId) {
      setError('Select a task.');
      return;
    }

    if (tasksFailed) {
      setError(tasksLoadError ?? 'Could not load tasks.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await setSessionTaskAttribution(session.id, selectedTaskId);
      onLinked();
      onClose();
    } catch (submitError) {
      const message = submitError instanceof SessionAttributionError
        || submitError instanceof Error
        ? submitError.message
        : 'Could not save task attribution.';
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="agenda-link-dialog-backdrop"
      role="presentation"
      onClick={() => {
        if (!isSaving) {
          onClose();
        }
      }}
    >
      <div
        className="agenda-link-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <h3>{title}</h3>
        <p className="task-panel-message">
          Session: {session.taskTitle ?? 'Untitled session'}
        </p>

        {tasksLoading ? (
          <p className="task-panel-message">Loading tasks…</p>
        ) : null}

        {tasksFailed ? (
          <div className="task-panel-error" role="alert">
            <p>{tasksLoadError ?? 'Could not load tasks.'}</p>
            <button type="button" className="retry-button" onClick={onRetryLoadTasks}>
              Retry
            </button>
          </div>
        ) : null}

        {!tasksLoading && !tasksFailed ? (
          <select
            className="settings-select"
            value={selectedTaskId}
            onChange={(event) => setSelectedTaskId(event.target.value)}
          >
            <option value="">Select a task</option>
            {tasks.map((task) => (
              <option key={task.id} value={task.id}>{task.title}</option>
            ))}
          </select>
        ) : null}

        {error ? <p className="settings-error" role="alert">{error}</p> : null}

        <div className="agenda-link-actions">
          <button type="button" onClick={onClose} disabled={isSaving}>Cancel</button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isSaving || tasksLoading || tasksFailed}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
