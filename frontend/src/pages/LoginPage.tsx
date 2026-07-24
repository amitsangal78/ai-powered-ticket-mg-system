import type { JSX } from 'react';

export function LoginPage(): JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Sign in</h1>
        <p className="mt-2 text-base text-gray-700">
          Login form arrives in Wave 5 (auth UI). API auth is Wave 2.
        </p>
      </div>
    </div>
  );
}
