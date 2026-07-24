import { useActionState, type JSX } from 'react';
import { VALID_ROLES } from '../schemas/domain';
import { createUserRequestSchema } from '../schemas/requests';
import { useUserStore } from '../stores/userStore';

type CreateState = {
  error: string | null;
  ok: boolean;
};

const initialState: CreateState = { error: null, ok: false };

async function createUserAction(
  _prev: CreateState,
  formData: FormData,
): Promise<CreateState> {
  const parsed = createUserRequestSchema.safeParse({
    name: String(formData.get('name') ?? ''),
    email: String(formData.get('email') ?? ''),
    role: String(formData.get('role') ?? ''),
    password: String(formData.get('password') ?? ''),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? 'Invalid user',
      ok: false,
    };
  }
  const user = await useUserStore.getState().createUser(parsed.data);
  if (!user) {
    return { error: 'Failed to create user', ok: false };
  }
  return { error: null, ok: true };
}

type Props = {
  onCreated?: (() => void) | undefined;
};

export function UserCreateForm({ onCreated }: Props): JSX.Element {
  const [state, formAction, isPending] = useActionState(
    async (prev: CreateState, formData: FormData) => {
      const next = await createUserAction(prev, formData);
      if (next.ok) {
        onCreated?.();
      }
      return next;
    },
    initialState,
  );

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
    >
      <h3 className="text-xl font-semibold text-gray-900">Create user</h3>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="user-name" className="block text-sm font-medium text-gray-800">
            Name
          </label>
          <input
            id="user-name"
            name="name"
            type="text"
            required
            maxLength={100}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="user-email" className="block text-sm font-medium text-gray-800">
            Email
          </label>
          <input
            id="user-email"
            name="email"
            type="email"
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="user-role" className="block text-sm font-medium text-gray-800">
            Role
          </label>
          <select
            id="user-role"
            name="role"
            defaultValue="agent"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {VALID_ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label
            htmlFor="user-password"
            className="block text-sm font-medium text-gray-800"
          >
            Password
          </label>
          <input
            id="user-password"
            name="password"
            type="password"
            required
            minLength={8}
            maxLength={128}
            autoComplete="new-password"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {state.error ? (
        <p className="text-sm text-red-700" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p className="text-sm text-green-700" role="status">
          User created.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? 'Creating…' : 'Create user'}
      </button>
    </form>
  );
}
