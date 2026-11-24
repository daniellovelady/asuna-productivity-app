import { useState } from 'react';
import type { ResolvedInsightItem } from '../types/weeklyInsight';

function InsightItemSection({
  title,
  items,
}: {
  title: string;
  items: ResolvedInsightItem[];
}): JSX.Element | null {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="insights-section">
      <h3>{title}</h3>
      <ul className="insights-item-list">
        {items.map((item) => (
          <InsightItemRow key={`${title}-${item.text}`} item={item} />
        ))}
      </ul>
    </section>
  );
}

function InsightItemRow({ item }: { item: ResolvedInsightItem }): JSX.Element {
  const [expanded, setExpanded] = useState(false);

  return (
    <li className="insights-item-row">
      <p>{item.text}</p>
      {item.evidence.length > 0 ? (
        <>
          <button
            type="button"
            className="insights-evidence-toggle"
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? 'Hide evidence' : 'Show evidence'}
          </button>
          {expanded ? (
            <ul className="insights-evidence-list">
              {item.evidence.map((evidence) => (
                <li key={`${evidence.path}-${evidence.value}`}>
                  <code>{evidence.path}</code>
                  {' '}
                  =
                  {' '}
                  {evidence.value}
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}
    </li>
  );
}

function formatDataConfidence(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

type WeeklyReportSectionProps = {
  report: import('../types/weeklyInsight').WeeklyInsightReport | null;
  isLoading: boolean;
  error: string | null;
  isStale: boolean;
  onGenerate: () => void;
};

export function WeeklyReportSection({
  report,
  isLoading,
  error,
  isStale,
  onGenerate,
}: WeeklyReportSectionProps): JSX.Element {
  return (
    <section className="weekly-report-section" aria-label="Weekly productivity report">
      <div className="weekly-report-header">
        <h2 className="insights-title">Weekly Report</h2>
        <button
          type="button"
          className="insights-ask-button"
          onClick={onGenerate}
          disabled={isLoading}
        >
          {isLoading ? 'Generating...' : report ? 'Refresh Report' : 'Generate Report'}
        </button>
      </div>

      <p className="insights-description">
        AI interpretation of your last seven days of A.S.U.N.A. analytics. Dashboard shows the numbers; this section explains them.
      </p>

      {isLoading ? <p className="insights-loading">Generating weekly report...</p> : null}

      {error ? (
        <div className="insights-error" role="alert">
          <p>{error}</p>
          {isStale ? <p className="insights-stale-note">Showing your last verified report.</p> : null}
        </div>
      ) : null}

      {report ? (
        <div className="insights-result">
          <p className="weekly-report-meta">
            Period:
            {' '}
            {report.reportPeriod.start}
            {' '}
            –
            {' '}
            {report.reportPeriod.end}
            {' '}
            (
            {report.reportPeriod.timezone}
            )
          </p>
          <p className="weekly-report-meta">
            Generated:
            {' '}
            {report.generatedAt}
          </p>
          <p className="weekly-report-confidence">
            Data confidence:
            {' '}
            {formatDataConfidence(report.dataConfidence)}
          </p>

          <InsightItemSection title="Summary" items={[report.summary]} />
          <InsightItemSection title="Strengths" items={report.strengths} />
          <InsightItemSection title="Observations" items={report.observations} />
          <InsightItemSection title="Recommendations" items={report.recommendations} />

          {report.limitations.length > 0 ? (
            <section className="insights-section">
              <h3>Limitations</h3>
              <ul>
                {report.limitations.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
