const STATS = [
  { label: 'Focus Time', value: '2h 15m' },
  { label: 'Sessions', value: '3' },
  { label: 'Productive Time', value: '1h 45m' },
  { label: 'Breaks', value: '2' },
] as const;

export function Statistics(): JSX.Element {
  return (
    <section className="statistics" aria-label="Statistics">
      <h2 className="card-title">Statistics</h2>
      <div className="statistics-grid">
        {STATS.map((stat) => (
          <article key={stat.label} className="card stat-card">
            <p className="stat-label">{stat.label}</p>
            <p className="stat-value">{stat.value}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
