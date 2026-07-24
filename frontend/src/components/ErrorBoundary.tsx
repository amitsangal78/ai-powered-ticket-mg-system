import { Component, type ErrorInfo, type JSX, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
  fallbackTitle?: string | undefined;
};

type State = {
  hasError: boolean;
  message: string;
};

export class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false, message: '' };

  public static getDerivedStateFromError(error: unknown): State {
    const message =
      error instanceof Error ? error.message : 'Something went wrong';
    return { hasError: true, message };
  }

  public componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error('Route error boundary', error, info.componentStack);
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          className="rounded-lg border border-red-200 bg-white p-6 shadow-sm"
          role="alert"
        >
          <h2 className="text-xl font-semibold text-gray-900">
            {this.props.fallbackTitle ?? 'Page error'}
          </h2>
          <p className="mt-2 text-base text-gray-700">{this.state.message}</p>
          <button
            type="button"
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            onClick={() => this.setState({ hasError: false, message: '' })}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/** Thin wrapper so pages can use a function component export if preferred */
export function RouteErrorBoundary({
  children,
  fallbackTitle,
}: Props): JSX.Element {
  return (
    <ErrorBoundary fallbackTitle={fallbackTitle}>{children}</ErrorBoundary>
  );
}
