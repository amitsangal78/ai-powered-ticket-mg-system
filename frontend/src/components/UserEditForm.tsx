import { useActionState, type JSX } from 'react';
import type { User } from '../schemas/domain';
import { VALID_ROLES } from '../schemas/domain';
import { updateUserRequestSchema } from '../schemas/requests';
import { useUserStore } from '../stores/userStore';

type EditState = {
  error: string | null;
  ok: boolean;
};

const initialState: EditState = { error: null, ok: false };

type Props = {
  user: User;
  onCancel: () => void;
  onSaved?: (() => void) | undefined;
};

export function UserEditForm({ user, onCancel, onSaved }: Props): JSX.Element {
  const [state, formAction, isPending] = useActionState(
    async (_prev: EditState, formData: FormData): Promise<EditState> => {
      const password = String(formData.get('password') ?? '');
      const body: {
        name?: string | undefined;
        email?: string | undefined;
        role?: 'agent' | 'admin' | undefined;
        password?: string | undefined;
      } = {
        name: String(formData.get('name') ?? ''),
        email: String(formData.get('email') ?? ''),
        role: String(formData.get('role') ?? '') as 'agent' | 'admin',
      };
      if (password.length > 0) {
        body.password = password;
      }

      const parsed = updateUserRequestSchema.safeParse(body);
      if (!parsed.success) {
        return {
          error: parsed.error.issues[0]?.message ?? 'Invalid update',
          ok: false,
        };
      }

      const updated = await useUserStore.getState().updateUser(user.id, parsed.data);
      if (!updated) {
        return { error: 'Failed to update user', ok: false };
      }
      onSaved?.();
      return { error: null, ok: true };
    },
    initialState,
  );

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-lg border border-blue-200 bg-blue-50 p-4"
    >
      <h4 className="text-lg font-medium text-gray-900">Edit {user.name}</h4>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label
            htmlFor={`edit-name-${user.id}`}
            className="block text-sm font-medium text-gray-800"
          >
            Name
          </label>
          <input
            id={`edit-name-${user.id}`}
            name="name"
            type="text"
            required
            maxLength={100}
            defaultValue={user.name}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-base text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="space-y-1">
          <label
            htmlFor={`edit-email-${user.id}`}
            className="block text-sm font-medium text-gray-800"
          >
            Email
          </label>
          <input
            id={`edit-email-${user.id}`}
            name="email"
            type="email"
            required
            defaultValue={user.email}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-base text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="space-y-1">
          <label
            htmlFor={`edit-role-${user.id}`}
            className="block text-sm font-medium text-gray-800"
          >
            Role
          </label>
          <select
            id={`edit-role-${user.id}`}
            name="role"
            defaultValue={user.role}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-base text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            htmlFor={`edit-password-${user.id}`}
            className="block text-sm font-medium text-gray-800"
          >
            New password (optional)
          </label>
          <input
            id={`edit-password-${user.id}`}
            name="password"
            type="password"
            minLength={8}
            maxLength={128}
            autoComplete="new-password"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-base text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          User updated.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-800 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
