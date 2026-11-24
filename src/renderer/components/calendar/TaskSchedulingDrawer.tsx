import { useMemo, useState } from 'react';
import type { ScheduleBlock } from '../../../shared/scheduling/types';
import { useTasks } from '../../hooks/useTasks';
import { countActiveBlocksForTask, groupTasksForDrawer } from './taskScheduleDrawerModel';
import { TaskScheduleDrawerRow } from './TaskScheduleDrawerRow';

const INITIAL_VISIBLE = 6;

type TaskSchedulingDrawerProps = {
  scheduleBlocks: readonly ScheduleBlock[];
  nowMs: number;
};

function TaskDrawerSection({
  title,
  tasks,
  scheduleBlocks,
  nowMs,
  defaultOpen,
  variant,
}: {
  title: string;
  tasks: ReturnType<typeof groupTasksForDrawer>['unscheduled'];
  scheduleBlocks: readonly ScheduleBlock[];
  nowMs: number;
  defaultOpen: boolean;
  variant: 'unscheduled' | 'scheduled';
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? tasks : tasks.slice(0, INITIAL_VISIBLE);

  return (
    <section className="calendar-task-section">
      <button
        type="button"
        className="calendar-task-section__toggle"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {title} ({tasks.length}) {open ? '▼' : '▶'}
      </button>
      {open ? (
        <div className="calendar-task-section__body">
          {visible.length === 0 ? (
            <p className="task-panel-message">No tasks.</p>
          ) : (
            <div className={showAll && tasks.length > INITIAL_VISIBLE ? 'calendar-task-section__scroll' : undefined}>
              {visible.map((task) => (
                <TaskScheduleDrawerRow
                  key={task.id}
                  task={task}
                  variant={variant}
                  activeBlockCount={countActiveBlocksForTask(task.id, scheduleBlocks, nowMs)}
                />
              ))}
            </div>
          )}
          {tasks.length > INITIAL_VISIBLE ? (
            <button
              type="button"
              className="calendar-task-section__show-all"
              onClick={() => setShowAll((value) => !value)}
            >
              {showAll ? 'Show less' : `Show all (${tasks.length})`}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export function TaskSchedulingDrawer({
  scheduleBlocks,
  nowMs,
}: TaskSchedulingDrawerProps): JSX.Element {
  const { tasks } = useTasks();
  const [search, setSearch] = useState('');

  const grouped = useMemo(
    () => groupTasksForDrawer(tasks, scheduleBlocks, nowMs, search),
    [tasks, scheduleBlocks, nowMs, search],
  );

  return (
    <section className="calendar-task-drawer" aria-label="Task scheduling drawer">
      <h3 className="calendar-side-heading">Tasks</h3>
      <label className="calendar-task-search">
        <span className="visually-hidden">Search tasks</span>
        <input
          type="search"
          placeholder="Search tasks…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>
      <TaskDrawerSection
        title="Unscheduled"
        tasks={grouped.unscheduled}
        scheduleBlocks={scheduleBlocks}
        nowMs={nowMs}
        defaultOpen
        variant="unscheduled"
      />
      <TaskDrawerSection
        title="Scheduled"
        tasks={grouped.scheduled}
        scheduleBlocks={scheduleBlocks}
        nowMs={nowMs}
        defaultOpen={false}
        variant="scheduled"
      />
    </section>
  );
}