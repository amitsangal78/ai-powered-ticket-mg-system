import type { Comment, Ticket, TicketPriority, TicketStatus } from '../schemas/domain.js';
import { query, toIsoString, withTransaction } from './base.js';

export type TicketRow = {
  id: string;
  title: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  assigned_to: string | null;
  created_by: string;
  created_at: Date;
  updated_at: Date;
};

export type CommentRow = {
  id: string;
  ticket_id: string;
  message: string;
  created_by: string;
  created_at: Date;
};

const TICKET_COLUMNS = `
  id, title, description, priority, status,
  assigned_to, created_by, created_at, updated_at
` as const;

const COMMENT_COLUMNS = `
  id, ticket_id, message, created_by, created_at
` as const;

export function toTicket(row: TicketRow): Ticket {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    priority: row.priority,
    status: row.status,
    assignedTo: row.assigned_to,
    createdBy: row.created_by,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

export function toComment(row: CommentRow): Comment {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    message: row.message,
    createdBy: row.created_by,
    createdAt: toIsoString(row.created_at),
  };
}

export type TicketListFilters = {
  search?: string;
  status?: TicketStatus;
};

export async function listTickets(
  filters: TicketListFilters = {},
): Promise<Ticket[]> {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filters.search !== undefined && filters.search.length > 0) {
    params.push(`%${filters.search}%`);
    const idx = params.length;
    clauses.push(
      `(title ILIKE $${idx} OR description ILIKE $${idx})`,
    );
  }

  if (filters.status !== undefined) {
    params.push(filters.status);
    clauses.push(`status = $${params.length}`);
  }

  const where =
    clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

  const result = await query<TicketRow>(
    `SELECT ${TICKET_COLUMNS}
     FROM tickets
     ${where}
     ORDER BY created_at DESC`,
    params,
  );

  return result.rows.map(toTicket);
}

export async function findTicketById(id: string): Promise<Ticket | null> {
  const result = await query<TicketRow>(
    `SELECT ${TICKET_COLUMNS}
     FROM tickets
     WHERE id = $1`,
    [id],
  );
  const row = result.rows[0];
  return row ? toTicket(row) : null;
}

export async function listCommentsForTicket(
  ticketId: string,
): Promise<Comment[]> {
  const result = await query<CommentRow>(
    `SELECT ${COMMENT_COLUMNS}
     FROM comments
     WHERE ticket_id = $1
     ORDER BY created_at ASC`,
    [ticketId],
  );
  return result.rows.map(toComment);
}

/**
 * Lock ticket row and update status inside a transaction (FOR UPDATE).
 * Caller must validate the transition before invoking.
 */
export async function updateTicketStatusWithLock(
  ticketId: string,
  toStatus: TicketStatus,
): Promise<Ticket | null> {
  return withTransaction(async (client) => {
    const locked = await client.query<TicketRow>(
      `SELECT ${TICKET_COLUMNS}
       FROM tickets
       WHERE id = $1
       FOR UPDATE`,
      [ticketId],
    );
    const current = locked.rows[0];
    if (!current) {
      return null;
    }

    const updated = await client.query<TicketRow>(
      `UPDATE tickets
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING ${TICKET_COLUMNS}`,
      [toStatus, ticketId],
    );
    const row = updated.rows[0];
    return row ? toTicket(row) : null;
  });
}
