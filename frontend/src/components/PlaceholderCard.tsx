import type { JSX } from 'react';

/** Placeholder — shared UI components land in Wave 5 */
export function PlaceholderCard({
  title,
}: {
  title: string;
}): JSX.Element {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-medium text-gray-900">{title}</h3>
    </div>
  );
}
