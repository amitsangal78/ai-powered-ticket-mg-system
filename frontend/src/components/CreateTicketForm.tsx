import { useActionState, useEffect, type JSX } from 'react';
import { createTicketRequestSchema } from '../schemas/requests';
import { VALID_PRIORITIES } from '../schemas/domain';
import { useTicketStore } from '../stores/ticketStore';
import { useUserStore } from '../stores/userStore';

type CreateState = {
  error: string | null;
  createdId: string | null;
};

const initialState: CreateState = { error: null, createdId: null };

async function createTicketAction(
  _prev: CreateState,
  formData: FormData,
): Promise<CreateState> {
  const assignedRaw = String(formData.get('assignedTo') ?? '');
  const body = {
    title: String(formData.get('title') ?? ''),
    description: String(formData.get('description') ?? ''),
    priority: String(formData.get('priority') ?? ''),
    assignedTo: assignedRaw.length > 0 ? assignedRaw : null,
  };
  const parsed = createTicketRequestSchema.safeParse(body);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? 'Invalid ticket',
      createdId: null,
    };
  }

  const ticket = await useTicketStore.getState().createTicket({
    title: parsed.data.title,
    description: parsed.data.description,
    priority: parsed.data.priority,
    assignedTo: parsed.data.assignedTo ?? null,
  });

  if (!ticket) {
    return { error: 'Failed to create ticket', createdId: null };
  }
  return { error: null, createdId: ticket.id };
}

type Props = {
  onCreated?: ((id: string) => void) | undefined;
};

export function CreateTicketForm({ onCreated }: Props): JSX.Element {
  const users = useUserStore((s) => s.users);
  const fetchUsers = useUserStore((s) => s.fetchUsers);
  const [state, formAction, isPending] = useActionState(
    createTicketAction,
    initialState,
  );

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    if (state.createdId && onCreated) {
      onCreated(state.createdId);
    }
  }, [state.createdId, onCreated]);

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
    >
      <h3 className="text-xl font-semibold text-gray-900">Create ticket</h3>

      <div className="space-y-1">
        <label htmlFor="create-title" className="block text-sm font-medium text-gray-800">
          Title
        </label>
        <input
          id="create-title"
          name="title"
          type="text"
          required
          maxLength={200}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="space-y-1">
        <label
          htmlFor="create-description"
          className="block text-sm font-medium text-gray-800"
        >
          Description
        </label>
        <textarea
          id="create-description"
          name="description"
          rows={4}
          required
          maxLength={5000}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label
            htmlFor="create-priority"
            className="block text-sm font-medium text-gray-800"
          >
            Priority
          </label>
          <select
            id="create-priority"
            name="priority"
            defaultValue="medium"
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
            htmlFor="create-assignee"
            className="block text-sm font-medium text-gray-800"
          >
            Assignee
          </label>
          <select
            id="create-assignee"
            name="assignedTo"
            defaultValue=""
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Unassigned</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.role})
              </option>
            ))}
          </select>
        </div>
      </div>

      {state.error ? (
        <p className="text-sm text-red-700" role="alert">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? 'Creating…' : 'Create ticket'}
      </button>
    </form>
  );
}
