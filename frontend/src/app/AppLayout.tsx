import type { JSX } from 'react';
import { Outlet } from 'react-router-dom';

export function AppLayout(): JSX.Element {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-700">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-xl font-semibold text-gray-900">
            Support Tickets
          </h1>
          <p className="text-sm text-gray-600">Scaffold — Wave 0</p>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
