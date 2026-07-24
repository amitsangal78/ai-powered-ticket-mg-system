import { Suspense, type JSX } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { useUiStore } from '../stores/uiStore';

function AppShellFallback(): JSX.Element {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="h-24 animate-pulse rounded-lg bg-gray-200" />
    </div>
  );
}

export function AppLayout(): JSX.Element {
  const bannerError = useUiStore((s) => s.bannerError);
  const setBannerError = useUiStore((s) => s.setBannerError);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-700">
      <Navbar />

      {bannerError ? (
        <div className="border-b border-red-200 bg-red-50">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2 sm:px-6 lg:px-8">
            <p className="text-sm text-red-700" role="alert">
              {bannerError}
            </p>
            <button
              type="button"
              onClick={() => setBannerError(null)}
              className="text-sm font-medium text-red-800 underline focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Suspense fallback={<AppShellFallback />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
