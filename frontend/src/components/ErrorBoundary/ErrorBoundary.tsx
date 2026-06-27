import { ErrorBoundary as ReactErrorBoundary, FallbackProps } from 'react-error-boundary';
import type { ReactNode } from 'react';

function ErrorFallback({ resetErrorBoundary }: FallbackProps) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
      <p className="text-sm font-semibold text-red-800">Something went wrong displaying this result.</p>
      <p className="mt-1 text-xs text-red-600">
        Try planning the trip again. If it keeps happening, the response may be in an unexpected format.
      </p>
      <button
        type="button"
        onClick={resetErrorBoundary}
        className="mt-3 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
      >
        Dismiss
      </button>
    </div>
  );
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export default function ErrorBoundary({ children, fallback }: ErrorBoundaryProps) {
  if (fallback) {
    return (
      <ReactErrorBoundary
        fallback={fallback}
        onError={(error, info) => console.error('Render error:', error, info)}
      >
        {children}
      </ReactErrorBoundary>
    );
  }

  return (
    <ReactErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, info) => console.error('Render error:', error, info)}
    >
      {children}
    </ReactErrorBoundary>
  );
}
