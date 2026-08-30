import { useFocusHistory } from '../hooks/useFocusHistory';

const PLACEHOLDER_STATS = [
  { label: 'Focus Time', value: '—' },
  { label: 'Productive Time', value: '—' },
  { label: 'Breaks', value: '—' },
] as const;

export function Statistics(): JSX.Element {
  const { sessions } = useFocusHistory();
  const sessionCount = sessions.length.toString();

  const stats = [
    { label: 'Sessions', value: sessionCount },
    ...PLACEHOLDER_STATS,
  ];

  return (
    <section className="statistics" aria-label="Statistics">
      <h2 className="card-title">Statistics</h2>
      <div className="statistics-grid">
        {stats.map((stat) => (
          <article key={stat.label} className="card stat-card">
            <p className="stat-label">{stat.label}</p>
            <p className="stat-value">{stat.value}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
