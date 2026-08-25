export function AssistantPlaceholder(): JSX.Element {
  return (
    <section
      className="assistant-placeholder"
      aria-label="Assistant placeholder"
    >
      <div className="assistant-avatar" aria-hidden="true" />
      <p className="assistant-label">Assistant</p>
    </section>
  );
}
