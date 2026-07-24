import type { JSX } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export function ProtectedRoute(): JSX.Element {
  const hydrated = useAuthStore((s) => s.hydrated);
  const user = useAuthStore((s) => s.user);

  if (!hydrated) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-gray-50"
        role="status"
        aria-live="polite"
      >
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
        <span className="sr-only">Loading session…</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
