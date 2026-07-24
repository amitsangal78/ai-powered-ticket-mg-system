import type { JSX } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

/** Requires authenticated admin. Hide nav until hydrated; redirect agents. */
export function AdminRoute(): JSX.Element {
  const hydrated = useAuthStore((s) => s.hydrated);
  const user = useAuthStore((s) => s.user);

  if (!hydrated) {
    return (
      <div className="flex justify-center py-12" role="status" aria-live="polite">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
        <span className="sr-only">Checking admin access…</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'admin') {
    return <Navigate to="/tickets" replace />;
  }

  return <Outlet />;
}
