import type { Task, TaskPriority } from '../../types/task';

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

type TaskScheduleDrawerRowProps = {
  task: Task;
  activeBlockCount?: number;
  variant: 'unscheduled' | 'scheduled';
};

export function TaskScheduleDrawerRow({
  task,
  activeBlockCount = 0,
  variant,
}: TaskScheduleDrawerRowProps): JSX.Element {
  return (
    <div className="calendar-task-row" data-variant={variant}>
      <span className="calendar-task-row__drag" aria-hidden="true" title="Drag scheduling (coming soon)">
        ⋮⋮
      </span>
      <div className="calendar-task-row__main">
        <div className="calendar-task-row__title">{task.title}</div>
        <div className="calendar-task-row__meta">
          <span className={`calendar-task-row__priority calendar-task-row__priority--${task.priority}`}>
            {PRIORITY_LABELS[task.priority]}
          </span>
          {variant === 'scheduled' ? (
            <span className="calendar-task-row__blocks">
              {activeBlockCount} scheduled block{activeBlockCount === 1 ? '' : 's'}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}