import { useState } from 'react';
import type { CalendarEvent } from '../../shared/calendar/types';
import type { Task } from '../types/task';
import { taskService } from '../services/taskService';
import {
  LinkTaskToEventValidationError,
  submitLinkTaskToEvent,
} from './linkTaskToEventSubmit';

type LinkTaskToEventDialogProps = {
  event: CalendarEvent;
  tasks: Task[];
  tasksLoadStatus: 'idle' | 'loading' | 'success' | 'error';
  tasksLoadError: string | null;
  onClose: () => void;
  onLinked: () => void;
  onRetryLoadTasks: () => void;
};

export function LinkTaskToEventDialog({
  event,
  tasks,
  tasksLoadStatus,
  tasksLoadError,
  onClose,
  onLinked,
  onRetryLoadTasks,
}: LinkTaskToEventDialogProps): JSX.Element {
  const [mode, setMode] = useState<'create' | 'link'>('link');
  const [newTaskTitle, setNewTaskTitle] = useState(event.title);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const tasksLoading = tasksLoadStatus === 'loading' || tasksLoadStatus === 'idle';
  const tasksFailed = tasksLoadStatus === 'error';

  const handleSubmit = async () => {
    if (mode === 'link' && tasksFailed) {
      setError(tasksLoadError ?? 'Could not load tasks.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await submitLinkTaskToEvent({
        mode,
        event,
        selectedTaskId,
        newTaskTitle,
        createTask: (input) => taskService.createTask(input),
      });

      onLinked();
      onClose();
    } catch (submitError) {
      const message = submitError instanceof LinkTaskToEventValidationError
        || submitError instanceof Error
        ? submitError.message
        : 'Could not save link.';
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
        aria-label="Link task to event"
        onClick={(clickEvent) => clickEvent.stopPropagation()}
      >
      <h3>Link task to &quot;{event.title}&quot;</h3>

      <div className="agenda-link-mode">
        <label>
          <input
            type="radio"
            name="link-mode"
            checked={mode === 'link'}
            onChange={() => setMode('link')}
          />
          Link existing task
        </label>
        <label>
          <input
            type="radio"
            name="link-mode"
            checked={mode === 'create'}
            onChange={() => setMode('create')}
          />
          Create new task
        </label>
      </div>

      {tasksLoading && mode === 'link' ? (
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

      {mode === 'link' && !tasksLoading && !tasksFailed ? (
        <select
          className="settings-select"
          value={selectedTaskId}
          onChange={(eventSelect) => setSelectedTaskId(eventSelect.target.value)}
        >
          <option value="">Select a task</option>
          {tasks.map((task) => (
            <option key={task.id} value={task.id}>{task.title}</option>
          ))}
        </select>
      ) : null}

      {mode === 'create' ? (
        <input
          type="text"
          className="settings-select"
          value={newTaskTitle}
          onChange={(titleEvent) => setNewTaskTitle(titleEvent.target.value)}
          placeholder="Task title"
          maxLength={200}
        />
      ) : null}

      {error ? <p className="settings-error" role="alert">{error}</p> : null}

      <div className="agenda-link-actions">
        <button type="button" onClick={onClose} disabled={isSaving}>Cancel</button>
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={isSaving || (mode === 'link' && (tasksLoading || tasksFailed))}
        >
          Save link
        </button>
      </div>
      </div>
    </div>
  );
}
