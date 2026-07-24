import { useActionState, useEffect, type JSX } from 'react';
import { Link, useParams } from 'react-router-dom';
import { updateTicketRequestSchema } from '../schemas/requests';
import { VALID_PRIORITIES } from '../schemas/domain';
import { useTicketStore } from '../stores/ticketStore';
import { useUserStore } from '../stores/userStore';
import { RouteErrorBoundary } from '../components/ErrorBoundary';
import { StatusButtons } from '../components/StatusButtons';
import { PriorityBadge } from '../components/PriorityBadge';
import { CommentForm } from '../components/CommentForm';

type EditState = {
  error: string | null;
  ok: boolean;
};

const initialEdit: EditState = { error: null, ok: false };

function TicketDetailContent(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const selected = useTicketStore((s) => s.selected);
  const detailLoading = useTicketStore((s) => s.detailLoading);
  const error = useTicketStore((s) => s.error);
  const fetchTicket = useTicketStore((s) => s.fetchTicket);
  const updateTicket = useTicketStore((s) => s.updateTicket);
  const clearSelected = useTicketStore((s) => s.clearSelected);
  const users = useUserStore((s) => s.users);
  const fetchUsers = useUserStore((s) => s.fetchUsers);

  useEffect(() => {
    if (id) {
      void fetchTicket(id);
    }
    void fetchUsers();
    return () => clearSelected();
  }, [id, fetchTicket, fetchUsers, clearSelected]);

  const [editState, editAction, editPending] = useActionState(
    async (_prev: EditState, formData: FormData): Promise<EditState> => {
      if (!id) return { error: 'Missing ticket id', ok: false };
      const assignedRaw = String(formData.get('assignedTo') ?? '');
      const body = {
        title: String(formData.get('title') ?? ''),
        description: String(formData.get('description') ?? ''),
        priority: String(formData.get('priority') ?? ''),
        assignedTo: assignedRaw.length > 0 ? assignedRaw : null,
      };
      const parsed = updateTicketRequestSchema.safeParse(body);
      if (!parsed.success) {
        return {
          error: parsed.error.issues[0]?.message ?? 'Invalid update',
          ok: false,
        };
      }
      const updated = await updateTicket(id, parsed.data);
      if (!updated) {
        return { error: 'Failed to update ticket', ok: false };
      }
      return { error: null, ok: true };
    },
    initialEdit,
  );

  if (detailLoading || !id) {
    return (
      <div
        className="animate-pulse space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
        role="status"
      >
        <div className="h-6 w-1/2 rounded bg-gray-200" />
        <div className="h-4 w-full rounded bg-gray-200" />
        <div className="h-4 w-3/4 rounded bg-gray-200" />
        <span className="sr-only">Loading ticket…</span>
      </div>
    );
  }

  if (error || !selected) {
    return (
      <div className="space-y-4">
        <Link
          to="/tickets"
          className="text-sm font-medium text-blue-700 underline focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Back to tickets
        </Link>
        <p className="text-base text-red-700" role="alert">
          {error ?? 'Ticket not found'}
        </p>
      </div>
    );
  }

  return (
    <article className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/tickets"
          className="text-sm font-medium text-blue-700 underline focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Back to tickets
        </Link>
        <PriorityBadge priority={selected.priority} />
      </div>

      <header className="space-y-2">
        <h2 className="text-2xl font-bold text-gray-900">{selected.title}</h2>
        <StatusButtons ticketId={selected.id} status={selected.status} />
      </header>

      <p className="text-base text-gray-700 whitespace-pre-wrap">
        {selected.description}
      </p>

      <form
        action={editAction}
        className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
      >
        <h3 className="text-xl font-semibold text-gray-900">Edit ticket</h3>
        <div className="space-y-1">
          <label htmlFor="edit-title" className="block text-sm font-medium text-gray-800">
            Title
          </label>
          <input
            id="edit-title"
            name="title"
            type="text"
            required
            maxLength={200}
            defaultValue={selected.title}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="space-y-1">
          <label
            htmlFor="edit-description"
            className="block text-sm font-medium text-gray-800"
          >
            Description
          </label>
          <textarea
            id="edit-description"
            name="description"
            rows={4}
            required
            maxLength={5000}
            defaultValue={selected.description}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label
              htmlFor="edit-priority"
              className="block text-sm font-medium text-gray-800"
            >
              Priority
            </label>
            <select
              id="edit-priority"
              name="priority"
              defaultValue={selected.priority}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {VALID_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label
              htmlFor="edit-assignee"
              className="block text-sm font-medium text-gray-800"
            >
              Assignee
            </label>
            <select
              id="edit-assignee"
              name="assignedTo"
              defaultValue={selected.assignedTo ?? ''}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        {editState.error ? (
          <p className="text-sm text-red-700" role="alert">
            {editState.error}
          </p>
        ) : null}
        {editState.ok ? (
          <p className="text-sm text-green-700" role="status">
            Ticket updated.
          </p>
        ) : null}
        <button
          type="submit"
          disabled={editPending}
          className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {editPending ? 'Saving…' : 'Save changes'}
        </button>
      </form>

      <CommentForm
        ticketId={selected.id}
        comments={selected.comments ?? []}
      />
    </article>
  );
}

export function TicketDetailPage(): JSX.Element {
  return (
    <RouteErrorBoundary fallbackTitle="Ticket detail failed">
      <TicketDetailContent />
    </RouteErrorBoundary>
  );
}
