import type {
  Comment,
  Ticket,
  TicketPriority,
  TicketStatus,
} from '../schemas/domain.js';
import {
  query,
  toIsoString,
  withTransaction,
  type TxQueryClient,
} from './base.js';

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

export type CreateTicketInput = {
  title: string;
  description: string;
  priority: TicketPriority;
  assignedTo: string | null;
  createdBy: string;
};

export type UpdateTicketFieldsInput = {
  title?: string;
  description?: string;
  priority?: TicketPriority;
  assignedTo?: string | null;
};

export async function listTickets(
  filters: TicketListFilters = {},
): Promise<Ticket[]> {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filters.search !== undefined && filters.search.length > 0) {
    params.push(`%${filters.search}%`);
    const idx = params.length;
    clauses.push(`(title ILIKE $${idx} OR description ILIKE $${idx})`);
  }

  if (filters.status !== undefined) {
    params.push(filters.status);
    clauses.push(`status = $${params.length}`);
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

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

export async function createTicket(
  input: CreateTicketInput,
): Promise<Ticket> {
  const result = await query<TicketRow>(
    `INSERT INTO tickets (
       title, description, priority, status, assigned_to, created_by
     ) VALUES ($1, $2, $3, 'Open', $4, $5)
     RETURNING ${TICKET_COLUMNS}`,
    [
      input.title,
      input.description,
      input.priority,
      input.assignedTo,
      input.createdBy,
    ],
  );
  const row = result.rows[0];
  if (!row) {
    throw new Error('Failed to insert ticket');
  }
  return toTicket(row);
}

export async function updateTicketFields(
  id: string,
  fields: UpdateTicketFieldsInput,
): Promise<Ticket | null> {
  const sets: string[] = [];
  const params: unknown[] = [];

  if (fields.title !== undefined) {
    params.push(fields.title);
    sets.push(`title = $${params.length}`);
  }
  if (fields.description !== undefined) {
    params.push(fields.description);
    sets.push(`description = $${params.length}`);
  }
  if (fields.priority !== undefined) {
    params.push(fields.priority);
    sets.push(`priority = $${params.length}`);
  }
  if (fields.assignedTo !== undefined) {
    params.push(fields.assignedTo);
    sets.push(`assigned_to = $${params.length}`);
  }

  if (sets.length === 0) {
    return findTicketById(id);
  }

  sets.push('updated_at = NOW()');
  params.push(id);

  const result = await query<TicketRow>(
    `UPDATE tickets
     SET ${sets.join(', ')}
     WHERE id = $${params.length}
     RETURNING ${TICKET_COLUMNS}`,
    params,
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

export async function createComment(input: {
  ticketId: string;
  message: string;
  createdBy: string;
}): Promise<Comment> {
  const result = await query<CommentRow>(
    `INSERT INTO comments (ticket_id, message, created_by)
     VALUES ($1, $2, $3)
     RETURNING ${COMMENT_COLUMNS}`,
    [input.ticketId, input.message, input.createdBy],
  );
  const row = result.rows[0];
  if (!row) {
    throw new Error('Failed to insert comment');
  }
  return toComment(row);
}

/** Used only by TicketStatusService inside a transaction. */
export async function lockTicketRow(
  client: TxQueryClient,
  ticketId: string,
): Promise<TicketRow | null> {
  const locked = await client.query<TicketRow>(
    `SELECT ${TICKET_COLUMNS}
     FROM tickets
     WHERE id = $1
     FOR UPDATE`,
    [ticketId],
  );
  return locked.rows[0] ?? null;
}

/** Used only by TicketStatusService inside a transaction. */
export async function applyTicketStatus(
  client: TxQueryClient,
  ticketId: string,
  toStatus: TicketStatus,
): Promise<Ticket> {
  const updated = await client.query<TicketRow>(
    `UPDATE tickets
     SET status = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING ${TICKET_COLUMNS}`,
    [toStatus, ticketId],
  );
  const row = updated.rows[0];
  if (!row) {
    throw new Error('Failed to update ticket status');
  }
  return toTicket(row);
}

export { withTransaction };
