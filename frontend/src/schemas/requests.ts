import { z } from 'zod';
import { plainText, VALID_PRIORITIES, VALID_STATUSES } from './domain';

export const loginRequestSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(1),
  })
  .strict();

export const createTicketRequestSchema = z
  .object({
    title: plainText(200),
    description: plainText(5000),
    priority: z.enum(VALID_PRIORITIES),
    assignedTo: z.string().uuid().nullable().optional(),
  })
  .strict();

export const updateTicketRequestSchema = z
  .object({
    title: plainText(200).optional(),
    description: plainText(5000).optional(),
    priority: z.enum(VALID_PRIORITIES).optional(),
    assignedTo: z.string().uuid().nullable().optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'At least one field is required',
  });

export const statusTransitionRequestSchema = z
  .object({
    status: z.enum(VALID_STATUSES),
  })
  .strict();

export const createCommentRequestSchema = z
  .object({
    message: plainText(2000),
  })
  .strict();

export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type CreateTicketRequest = z.infer<typeof createTicketRequestSchema>;
export type UpdateTicketRequest = z.infer<typeof updateTicketRequestSchema>;
export type StatusTransitionRequest = z.infer<
  typeof statusTransitionRequestSchema
>;
export type CreateCommentRequest = z.infer<typeof createCommentRequestSchema>;
