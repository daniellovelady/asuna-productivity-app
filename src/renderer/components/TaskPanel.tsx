import { useEffect, useState } from 'react';
import { PaginationControls } from './PaginationControls';
import { useTasks } from '../hooks/useTasks';
import { clampPage, getPageCount, getPageSlice } from '../utils/pagination';
import {
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_OPTIONS,
  type Task,
  type TaskPriority,
} from '../types/task';

type TaskView = 'active' | 'completed';

function formatStatus(status: string): string {
  return status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatCompletedAt(value: string | null): string | null {
  if (!value) {
    return null;
  }

  return new Date(value).toLocaleString();
}

function normalizeDescription(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

interface PrioritySelectProps {
  id: string;
  value: TaskPriority;
  onChange: (priority: TaskPriority) => void;
  disabled?: boolean;
}

function PrioritySelect({ id, value, onChange, disabled }: PrioritySelectProps): JSX.Element {
  return (
    <>
      <label className="task-field-label" htmlFor={id}>
        Priority
      </label>
      <select
        id={id}
        className="task-select"
        value={value}
        onChange={(event) => onChange(event.target.value as TaskPriority)}
        disabled={disabled}
      >
        {TASK_PRIORITY_OPTIONS.map((priority) => (
          <option key={priority} value={priority}>
            {TASK_PRIORITY_LABELS[priority]}
          </option>
        ))}
      </select>
    </>
  );
}

interface TaskEditFormProps {
  taskId: string;
  title: string;
  description: string;
  priority: TaskPriority;
  updatedAt: string;
  isMutating: boolean;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onPriorityChange: (value: TaskPriority) => void;
  onSave: () => void;
  onCancel: () => void;
}

function TaskEditForm({
  taskId,
  title,
  description,
  priority,
  isMutating,
  onTitleChange,
  onDescriptionChange,
  onPriorityChange,
  onSave,
  onCancel,
}: TaskEditFormProps): JSX.Element {
  return (
    <div className="task-edit-form">
      <input
        type="text"
        className="task-input"
        value={title}
        onChange={(event) => onTitleChange(event.target.value)}
        disabled={isMutating}
      />
      <textarea
        className="task-textarea"
        placeholder="Description (optional)"
        rows={3}
        value={description}
        onChange={(event) => onDescriptionChange(event.target.value)}
        disabled={isMutating}
      />
      <PrioritySelect
        id={`edit-task-priority-${taskId}`}
        value={priority}
        onChange={onPriorityChange}
        disabled={isMutating}
      />
      <button
        type="button"
        className="task-button"
        onClick={onSave}
        disabled={isMutating || !title.trim()}
      >
        Save
      </button>
      <button
        type="button"
        className="task-button task-button-secondary"
        onClick={onCancel}
        disabled={isMutating}
      >
        Cancel
      </button>
    </div>
  );
}

interface TaskPanelProps {
  selectionLocked: boolean;
}

export function TaskPanel({ selectionLocked }: TaskPanelProps): JSX.Element {
  const {
    activeTasks,
    completedTasks,
    selectedTaskId,
    loadStatus,
    loadError,
    mutationError,
    isMutating,
    selectTask,
    reloadTasks,
    createTask,
    updateTask,
    completeTask,
    deleteTask,
    clearMutationError,
  } = useTasks();

  const [taskView, setTaskView] = useState<TaskView>('active');
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState<TaskPriority>('medium');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPriority, setEditPriority] = useState<TaskPriority>('medium');
  const [activePage, setActivePage] = useState(1);
  const [completedPage, setCompletedPage] = useState(1);

  const activePageCount = getPageCount(activeTasks.length);
  const completedPageCount = getPageCount(completedTasks.length);
  const clampedActivePage = clampPage(activePage, activePageCount);
  const clampedCompletedPage = clampPage(completedPage, completedPageCount);

  useEffect(() => {
    if (activePage !== clampedActivePage) {
      setActivePage(clampedActivePage);
    }
  }, [activePage, clampedActivePage]);

  useEffect(() => {
    if (completedPage !== clampedCompletedPage) {
      setCompletedPage(clampedCompletedPage);
    }
  }, [completedPage, clampedCompletedPage]);

  const visibleTasks = getPageSlice(
    taskView === 'active' ? activeTasks : completedTasks,
    taskView === 'active' ? clampedActivePage : clampedCompletedPage,
  );

  const currentPage = taskView === 'active' ? clampedActivePage : clampedCompletedPage;
  const currentPageCount = taskView === 'active' ? activePageCount : completedPageCount;
  const setCurrentPage = taskView === 'active' ? setActivePage : setCompletedPage;
  const listItemCount = taskView === 'active' ? activeTasks.length : completedTasks.length;

  const handleCreate = async () => {
    const title = newTitle.trim();
    if (!title) {
      return;
    }

    await createTask({
      title,
      description: normalizeDescription(newDescription),
      priority: newPriority,
    });
    setNewTitle('');
    setNewDescription('');
    setNewPriority('medium');
  };

  const startEditing = (task: Task) => {
    setEditingTaskId(task.id);
    setEditTitle(task.title);
    setEditDescription(task.description ?? '');
    setEditPriority(task.priority);
    clearMutationError();
  };

  const cancelEditing = () => {
    setEditingTaskId(null);
    setEditTitle('');
    setEditDescription('');
    setEditPriority('medium');
  };

  const handleSaveEdit = async (taskId: string, updatedAt: string) => {
    const title = editTitle.trim();
    if (!title) {
      return;
    }

    await updateTask(
      taskId,
      {
        title,
        description: normalizeDescription(editDescription),
        priority: editPriority,
      },
      updatedAt,
    );
    cancelEditing();
  };

  const renderTaskActions = (task: Task, showComplete: boolean) => (
    <div className="task-actions">
      <button
        type="button"
        className="task-button task-button-secondary"
        onClick={() => startEditing(task)}
        disabled={isMutating}
      >
        Edit
      </button>
      {showComplete ? (
        <button
          type="button"
          className="task-button task-button-secondary"
          onClick={() => void completeTask(task.id, task.updatedAt)}
          disabled={isMutating}
        >
          Complete
        </button>
      ) : null}
      <button
        type="button"
        className="task-button task-button-secondary"
        onClick={() => void deleteTask(task.id, task.updatedAt)}
        disabled={isMutating}
      >
        Delete
      </button>
    </div>
  );

  return (
    <section className="card task-panel" aria-label="Tasks">
      <div className="panel-header">
        <h2 className="card-title">Tasks</h2>
        <button
          type="button"
          className="refresh-button"
          onClick={() => void reloadTasks()}
          disabled={loadStatus === 'loading' || isMutating}
        >
          Refresh
        </button>
      </div>

      <div className="task-view-tabs" role="tablist" aria-label="Task views">
        <button
          type="button"
          role="tab"
          className={
            taskView === 'active'
              ? 'task-view-tab task-view-tab--selected'
              : 'task-view-tab'
          }
          aria-selected={taskView === 'active'}
          onClick={() => setTaskView('active')}
        >
          Active
        </button>
        <button
          type="button"
          role="tab"
          className={
            taskView === 'completed'
              ? 'task-view-tab task-view-tab--selected'
              : 'task-view-tab'
          }
          aria-selected={taskView === 'completed'}
          onClick={() => setTaskView('completed')}
        >
          Completed
        </button>
      </div>

      {loadStatus === 'loading' ? (
        <p className="task-panel-message">Loading tasks…</p>
      ) : null}

      {loadStatus === 'error' ? (
        <div className="task-panel-error" role="alert">
          <p>{loadError}</p>
          <button type="button" className="retry-button" onClick={() => void reloadTasks()}>
            Retry
          </button>
        </div>
      ) : null}

      {mutationError ? (
        <p className="task-panel-error" role="alert">
          {mutationError}
        </p>
      ) : null}

      {loadStatus === 'success' ? (
        <>
          {taskView === 'active' ? (
            <div className="task-create-form">
              <input
                type="text"
                className="task-input"
                placeholder="New task title"
                value={newTitle}
                onChange={(event) => setNewTitle(event.target.value)}
                disabled={isMutating}
              />
              <textarea
                className="task-textarea"
                placeholder="Description (optional)"
                rows={3}
                value={newDescription}
                onChange={(event) => setNewDescription(event.target.value)}
                disabled={isMutating}
              />
              <PrioritySelect
                id="new-task-priority"
                value={newPriority}
                onChange={setNewPriority}
                disabled={isMutating}
              />
              <button
                type="button"
                className="task-button"
                onClick={() => void handleCreate()}
                disabled={isMutating || !newTitle.trim()}
              >
                Create
              </button>
            </div>
          ) : null}

          {listItemCount === 0 ? (
            <p className="task-panel-message">
              {taskView === 'active' ? 'No active tasks yet.' : 'No completed tasks yet.'}
            </p>
          ) : (
            <>
            <ul className="task-list">
              {visibleTasks.map((task) => (
                <li
                  key={task.id}
                  className={
                    taskView === 'active' && task.id === selectedTaskId
                      ? 'task-list-item task-list-item-selected'
                      : 'task-list-item'
                  }
                >
                  {editingTaskId === task.id ? (
                    <TaskEditForm
                      taskId={task.id}
                      title={editTitle}
                      description={editDescription}
                      priority={editPriority}
                      updatedAt={task.updatedAt}
                      isMutating={isMutating}
                      onTitleChange={setEditTitle}
                      onDescriptionChange={setEditDescription}
                      onPriorityChange={setEditPriority}
                      onSave={() => void handleSaveEdit(task.id, task.updatedAt)}
                      onCancel={cancelEditing}
                    />
                  ) : taskView === 'active' ? (
                    <>
                      <button
                        type="button"
                        className="task-select-button"
                        onClick={() => selectTask(task.id)}
                        disabled={selectionLocked || isMutating}
                        aria-pressed={task.id === selectedTaskId}
                      >
                        <span className="task-list-title">{task.title}</span>
                        <span className="task-list-meta">
                          {TASK_PRIORITY_LABELS[task.priority]}
                          {' · '}
                          {formatStatus(task.status)}
                        </span>
                      </button>
                      {renderTaskActions(task, true)}
                    </>
                  ) : (
                    <>
                      <div className="task-completed-row">
                        <span className="task-list-title">{task.title}</span>
                        <span className="task-list-meta">
                          {TASK_PRIORITY_LABELS[task.priority]}
                          {' · '}
                          Completed
                          {task.completedAt ? ` · ${formatCompletedAt(task.completedAt)}` : ''}
                        </span>
                        {task.description ? (
                          <p className="task-completed-description">{task.description}</p>
                        ) : null}
                      </div>
                      {renderTaskActions(task, false)}
                    </>
                  )}
                </li>
              ))}
            </ul>
            <PaginationControls
              currentPage={currentPage}
              pageCount={currentPageCount}
              onPageChange={setCurrentPage}
            />
            </>
          )}
        </>
      ) : null}
    </section>
  );
}
