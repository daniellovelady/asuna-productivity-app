import { useState } from 'react';
import { useCoach } from '../hooks/useCoach';

export function InsightsView(): JSX.Element {
  const [question, setQuestion] = useState('');
  const coach = useCoach();

  const handleSubmit = () => {
    if (!question.trim()) {
      return;
    }
    void coach.analyze(question.trim());
  };

  const result = coach.response?.result;

  return (
    <section className="insights-view" aria-label="Productivity coach">
      <h2 className="insights-title">Insights Coach</h2>
      <p className="insights-description">
        Ask questions about your productivity data. The coach is read-only and uses your
        A.S.U.N.A. analytics and active tasks.
      </p>

      <label className="insights-label" htmlFor="coach-question">
        Your question
      </label>
      <textarea
        id="coach-question"
        className="insights-question-input"
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        rows={4}
        maxLength={2000}
        placeholder="How productive was I this week?"
        disabled={coach.isLoading}
      />

      <div className="insights-actions">
        <button
          type="button"
          className="insights-ask-button"
          onClick={handleSubmit}
          disabled={coach.isLoading || question.trim().length === 0}
        >
          {coach.isLoading ? 'Asking Coach...' : 'Ask Coach'}
        </button>
        {coach.error ? (
          <button
            type="button"
            className="insights-retry-button"
            onClick={() => {
              coach.reset();
            }}
          >
            Dismiss
          </button>
        ) : null}
      </div>

      {coach.isLoading ? <p className="insights-loading">Loading coach response...</p> : null}

      {coach.error ? (
        <div className="insights-error" role="alert">
          <p>{coach.error}</p>
          <button
            type="button"
            className="insights-retry-button"
            onClick={() => {
              void coach.analyze(question.trim());
            }}
          >
            Retry
          </button>
        </div>
      ) : null}

      {result ? (
        <div className="insights-result">
          <section className="insights-section">
            <h3>Answer</h3>
            <p>{result.answer}</p>
          </section>

          {result.recommendations.length > 0 ? (
            <section className="insights-section">
              <h3>Recommendations</h3>
              <ul>
                {result.recommendations.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {result.evidence.length > 0 ? (
            <section className="insights-section">
              <h3>Evidence</h3>
              <ul className="insights-evidence-list">
                {result.evidence.map((item) => (
                  <li key={`${item.source}-${item.path}`}>
                    <code>{item.path}</code>
                    {' '}
                    =
                    {' '}
                    {item.value}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {result.limitations.length > 0 ? (
            <section className="insights-section">
              <h3>Limitations</h3>
              <ul>
                {result.limitations.map((item) => (
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
