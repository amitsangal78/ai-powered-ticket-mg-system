import { z } from 'zod';

/** Reject HTML-like characters in plain-text fields */
export const plainText = (max: number): z.ZodString =>
  z
    .string()
    .min(1)
    .max(max)
    .regex(/^[^<>]*$/, 'HTML not allowed');

export const VALID_STATUSES = [
  'Open',
  'In Progress',
  'Resolved',
  'Closed',
  'Cancelled',
] as const;
export type TicketStatus = (typeof VALID_STATUSES)[number];

export const TRANSITIONS: Readonly<
  Record<TicketStatus, readonly TicketStatus[]>
> = {
  Open: ['In Progress', 'Cancelled'],
  'In Progress': ['Resolved', 'Cancelled'],
  Resolved: ['Closed'],
  Closed: [],
  Cancelled: [],
} as const;

export const VALID_PRIORITIES = ['low', 'medium', 'high'] as const;
export type TicketPriority = (typeof VALID_PRIORITIES)[number];

export const VALID_ROLES = ['agent', 'admin'] as const;
export type UserRole = (typeof VALID_ROLES)[number];

export const apiErrorSchema = z.object({
  error: z.string(),
  code: z.string(),
  details: z.unknown().optional(),
});
export type ApiError = z.infer<typeof apiErrorSchema>;

export const userSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  email: z.string().email(),
  role: z.enum(VALID_ROLES),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type User = z.infer<typeof userSchema>;

export const ticketSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  priority: z.enum(VALID_PRIORITIES),
  status: z.enum(VALID_STATUSES),
  assignedTo: z.string().uuid().nullable(),
  createdBy: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Ticket = z.infer<typeof ticketSchema>;

export const commentSchema = z.object({
  id: z.string().uuid(),
  ticketId: z.string().uuid(),
  message: z.string().min(1).max(2000),
  createdBy: z.string().uuid(),
  createdAt: z.string().datetime(),
});
export type Comment = z.infer<typeof commentSchema>;
