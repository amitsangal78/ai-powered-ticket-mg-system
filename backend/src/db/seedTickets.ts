import { loadEnv } from '../config/env.js';
import { loadDotEnvFile } from '../config/loadDotEnv.js';
import { closePool, createPool, getPool } from './pool.js';

const STATUSES = [
  'Open',
  'In Progress',
  'Resolved',
  'Closed',
  'Cancelled',
] as const;

const PRIORITIES = ['low', 'medium', 'high'] as const;

const TOPICS = [
  'Printer offline',
  'VPN timeout',
  'Email bounce',
  'Laptop battery',
  'SSO login failure',
  'Shared drive access',
  'Monitor flicker',
  'Slack notifications',
  'Calendar sync',
  'Password reset loop',
  'Wi-Fi drops',
  'Headset static',
  'CRM slow queries',
  'Invoice PDF export',
  'Badge reader error',
  'Zoom audio echo',
  'Git push rejected',
  'Docker disk full',
  'Staging deploy fail',
  'API rate limit',
  'Missing invoice line',
  'Duplicate expense claim',
  'Onboarding checklist',
  'Leave balance mismatch',
  'Timesheet locked',
] as const;

function pick<T>(items: readonly T[], index: number): T {
  const item = items[index % items.length];
  if (item === undefined) {
    throw new Error('Empty pick list');
  }
  return item;
}

function descriptionFor(title: string, i: number): string {
  return [
    `Demo ticket #${i}: ${title}.`,
    'Created for local scenario testing (search, filters, status transitions, assignment).',
    `Expected next steps vary by current status — agents can move Open tickets to In Progress, etc.`,
  ].join(' ');
}

/**
 * Inserts COUNT sample tickets with mixed status/priority/assignee for UI demos.
 * Idempotent-ish: skips if at least COUNT tickets already exist.
 */
export async function seedDemoTickets(count = 50): Promise<void> {
  loadDotEnvFile();
  const env = loadEnv();
  createPool(env);

  try {
    const pool = getPool();

    const users = await pool.query<{ id: string; email: string; role: string }>(
      `SELECT id, email, role
       FROM users
       WHERE LOWER(email) IN ('admin@example.com', 'agent@example.com')
       ORDER BY email`,
    );

    if (users.rowCount === null || users.rowCount < 2) {
      throw new Error(
        'Seed users missing. Run `npm run seed` before seeding tickets.',
      );
    }

    const admin = users.rows.find((u) => u.role === 'admin');
    const agent = users.rows.find((u) => u.role === 'agent');
    if (!admin || !agent) {
      throw new Error('Need both admin and agent seed users.');
    }

    const existing = await pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM tickets`,
    );
    const current = Number(existing.rows[0]?.count ?? 0);
    if (current >= count) {
      console.info(
        `Tickets already present (${current} >= ${count}); skipping demo ticket seed.`,
      );
      return;
    }

    const toInsert = count - current;
    console.info(`Inserting ${toInsert} demo tickets (have ${current})…`);

    for (let i = current + 1; i <= count; i += 1) {
      const title = `${pick(TOPICS, i)} #${i}`;
      const status = pick(STATUSES, i);
      const priority = pick(PRIORITIES, i);
      // Rotate assignee: unassigned / agent / admin
      const assigneeMode = i % 3;
      const assignedTo =
        assigneeMode === 0 ? null : assigneeMode === 1 ? agent.id : admin.id;
      // Prefer agent as creator; occasionally admin
      const createdBy = i % 5 === 0 ? admin.id : agent.id;

      const ticketResult = await pool.query<{ id: string }>(
        `INSERT INTO tickets (
           title, description, priority, status, assigned_to, created_by
         ) VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [
          title.slice(0, 200),
          descriptionFor(title, i),
          priority,
          status,
          assignedTo,
          createdBy,
        ],
      );

      const ticketId = ticketResult.rows[0]?.id;
      if (!ticketId) {
        throw new Error(`Failed to insert ticket #${i}`);
      }

      // Add 0–2 comments on non-cancelled tickets for detail-page demos
      if (status !== 'Cancelled' && i % 2 === 0) {
        await pool.query(
          `INSERT INTO comments (ticket_id, message, created_by)
           VALUES ($1, $2, $3)`,
          [
            ticketId,
            `Initial triage note for ticket #${i}: looking into this.`,
            agent.id,
          ],
        );
        if (i % 4 === 0) {
          await pool.query(
            `INSERT INTO comments (ticket_id, message, created_by)
             VALUES ($1, $2, $3)`,
            [
              ticketId,
              `Follow-up #${i}: customer replied with more details.`,
              admin.id,
            ],
          );
        }
      }
    }

    const finalCount = await pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM tickets`,
    );
    console.info(
      `Demo ticket seed complete. Total tickets: ${finalCount.rows[0]?.count ?? '?'}`,
    );
  } finally {
    await closePool();
  }
}

void seedDemoTickets(50).catch((err: unknown) => {
  console.error(
    'Demo ticket seed failed:',
    err instanceof Error ? err.message : err,
  );
  process.exit(1);
});
