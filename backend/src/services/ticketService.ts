import type { Comment, Ticket, TicketStatus } from '../schemas/domain.js';
import { AppError } from '../middleware/errors.js';
import type {
  CreateTicketRequest,
  UpdateTicketRequest,
} from '../schemas/requests.js';
import {
  createComment,
  createTicket,
  findTicketById,
  listCommentsForTicket,
  listTickets,
  updateTicketFields,
  type TicketListFilters,
} from '../repositories/ticketRepository.js';
import { TicketStatusService } from './ticketStatusService.js';

export type TicketDetail = Ticket & { comments: Comment[] };

export async function createTicketForUser(
  createdBy: string,
  input: CreateTicketRequest,
): Promise<Ticket> {
  return createTicket({
    title: input.title,
    description: input.description,
    priority: input.priority,
    assignedTo: input.assignedTo ?? null,
    createdBy,
  });
}

export async function listTicketsForUser(
  filters: TicketListFilters,
): Promise<Ticket[]> {
  return listTickets(filters);
}

export async function getTicketDetail(
  ticketId: string,
): Promise<TicketDetail> {
  const ticket = await findTicketById(ticketId);
  if (!ticket) {
    throw new AppError(404, 'NOT_FOUND', 'Ticket not found');
  }
  const comments = await listCommentsForTicket(ticketId);
  return { ...ticket, comments };
}

export async function updateTicketForUser(
  ticketId: string,
  input: UpdateTicketRequest,
): Promise<Ticket> {
  const updated = await updateTicketFields(ticketId, {
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.description !== undefined
      ? { description: input.description }
      : {}),
    ...(input.priority !== undefined ? { priority: input.priority } : {}),
    ...(input.assignedTo !== undefined
      ? { assignedTo: input.assignedTo }
      : {}),
  });
  if (!updated) {
    throw new AppError(404, 'NOT_FOUND', 'Ticket not found');
  }
  return updated;
}

export async function changeTicketStatus(
  ticketId: string,
  toStatus: TicketStatus,
): Promise<Ticket> {
  return TicketStatusService.transition(ticketId, toStatus);
}

export async function addCommentForUser(
  ticketId: string,
  createdBy: string,
  message: string,
): Promise<Comment> {
  const ticket = await findTicketById(ticketId);
  if (!ticket) {
    throw new AppError(404, 'NOT_FOUND', 'Ticket not found');
  }
  return createComment({ ticketId, message, createdBy });
}

export async function listCommentsForUser(
  ticketId: string,
): Promise<Comment[]> {
  const ticket = await findTicketById(ticketId);
  if (!ticket) {
    throw new AppError(404, 'NOT_FOUND', 'Ticket not found');
  }
  return listCommentsForTicket(ticketId);
}
