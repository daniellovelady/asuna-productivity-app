import { Component, type ErrorInfo, type ReactNode } from 'react';
import { rendererBootLog, sanitizeDiagnosticMessage, sanitizeDiagnosticStack } from './rendererBoot';

type RendererErrorBoundaryProps = {
  children: ReactNode;
};

type RendererErrorBoundaryState = {
  hasError: boolean;
  message: string;
};

export class RendererErrorBoundary extends Component<
  RendererErrorBoundaryProps,
  RendererErrorBoundaryState
> {
  state: RendererErrorBoundaryState = {
    hasError: false,
    message: '',
  };

  static getDerivedStateFromError(error: Error): RendererErrorBoundaryState {
    return {
      hasError: true,
      message: sanitizeDiagnosticMessage(error.message),
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env.DEV) {
      rendererBootLog('react-boundary-triggered');
      console.error(
        '[renderer-error] react-boundary',
        'message=',
        sanitizeDiagnosticMessage(error.message),
        'componentStack=',
        info.componentStack?.slice(0, 800) ?? '',
        sanitizeDiagnosticStack(error.stack),
      );
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="auth-screen" role="alert">
          <p>A.S.U.N.A. encountered a renderer error.</p>
          {import.meta.env.DEV ? (
            <p className="task-panel-message">{this.state.message}</p>
          ) : null}
        </div>
      );
    }

    return this.props.children;
  }
}