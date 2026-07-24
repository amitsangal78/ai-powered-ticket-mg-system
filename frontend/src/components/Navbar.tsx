import type { JSX } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

const linkClass = ({ isActive }: { isActive: boolean }): string =>
  [
    'rounded-md px-2 py-1 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500',
    isActive
      ? 'bg-blue-50 text-blue-800'
      : 'text-gray-700 hover:text-gray-900',
  ].join(' ');

export function Navbar(): JSX.Element {
  const hydrated = useAuthStore((s) => s.hydrated);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const showAdmin = hydrated && user?.role === 'admin';

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <NavLink
            to="/tickets"
            className="text-xl font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Support Tickets
          </NavLink>
          <nav aria-label="Main" className="flex items-center gap-2 text-sm font-medium">
            <NavLink to="/tickets" className={linkClass} end={false}>
              Tickets
            </NavLink>
            {showAdmin ? (
              <NavLink to="/users" className={linkClass}>
                Users
              </NavLink>
            ) : null}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {hydrated && user ? (
            <>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-800">{user.name}</p>
                <p className="text-sm text-gray-600">
                  {user.email} · {user.role}
                </p>
              </div>
              <button
                type="button"
                onClick={() => logout()}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Log out
              </button>
            </>
          ) : (
            <div
              className="h-8 w-32 animate-pulse rounded bg-gray-200"
              role="status"
              aria-label="Loading user"
            />
          )}
        </div>
      </div>
    </header>
  );
}
