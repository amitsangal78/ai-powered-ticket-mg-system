import type { TicketPriority, TicketStatus } from '../schemas/domain';

/** Exact maps from tailwind-standards.mdc */
export const STATUS_STYLES: Readonly<Record<TicketStatus, string>> = {
  Open: 'bg-gray-100 text-gray-800',
  'In Progress': 'bg-yellow-100 text-yellow-800',
  Resolved: 'bg-green-100 text-green-800',
  Closed: 'bg-purple-100 text-purple-800',
  Cancelled: 'bg-red-100 text-red-800',
};

export const PRIORITY_STYLES: Readonly<Record<TicketPriority, string>> = {
  low: 'bg-blue-100 text-blue-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800',
};
