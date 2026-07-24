import { useEffect, useState, type JSX } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useUserStore } from '../stores/userStore';
import { RouteErrorBoundary } from '../components/ErrorBoundary';
import { UserCreateForm } from '../components/UserCreateForm';
import { UserEditForm } from '../components/UserEditForm';

function UsersPageContent(): JSX.Element {
  const currentUser = useAuthStore((s) => s.user);
  const users = useUserStore((s) => s.users);
  const loading = useUserStore((s) => s.loading);
  const error = useUserStore((s) => s.error);
  const fetchUsers = useUserStore((s) => s.fetchUsers);
  const deleteUser = useUserStore((s) => s.deleteUser);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  async function handleDelete(id: string, name: string): Promise<void> {
    if (id === currentUser?.id) {
      setDeleteError('You cannot delete your own account.');
      return;
    }
    const confirmed = window.confirm(`Delete user “${name}”? This cannot be undone.`);
    if (!confirmed) return;
    setDeleteError(null);
    setDeletingId(id);
    const ok = await deleteUser(id);
    setDeletingId(null);
    if (!ok) {
      setDeleteError('Failed to delete user.');
      return;
    }
    if (editingId === id) {
      setEditingId(null);
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Users</h2>
          <p className="mt-1 text-base text-gray-700">
            Admin-only user management.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          {showCreate ? 'Hide form' : 'New user'}
        </button>
      </div>

      {showCreate ? (
        <UserCreateForm
          onCreated={() => {
            setShowCreate(false);
            void fetchUsers();
          }}
        />
      ) : null}

      {error ? (
        <p className="text-base text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {deleteError ? (
        <p className="text-base text-red-700" role="alert">
          {deleteError}
        </p>
      ) : null}

      {loading ? (
        <div
          className="animate-pulse space-y-3 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
          role="status"
        >
          <div className="h-4 w-1/3 rounded bg-gray-200" />
          <div className="h-4 w-2/3 rounded bg-gray-200" />
          <span className="sr-only">Loading users…</span>
        </div>
      ) : (
        <ul className="space-y-3">
          {users.map((user) => (
            <li
              key={user.id}
              className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
            >
              {editingId === user.id ? (
                <UserEditForm
                  user={user}
                  onCancel={() => setEditingId(null)}
                  onSaved={() => setEditingId(null)}
                />
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-lg font-medium text-gray-900">{user.name}</p>
                    <p className="text-sm text-gray-600">
                      {user.email} · {user.role}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingId(user.id)}
                      className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={deletingId === user.id || user.id === currentUser?.id}
                      onClick={() => void handleDelete(user.id, user.name)}
                      className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deletingId === user.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
          {users.length === 0 ? (
            <li className="rounded-lg border border-gray-200 bg-white p-6 text-base text-gray-700 shadow-sm">
              No users found.
            </li>
          ) : null}
        </ul>
      )}
    </section>
  );
}

export function UsersPage(): JSX.Element {
  return (
    <RouteErrorBoundary fallbackTitle="Users failed to load">
      <UsersPageContent />
    </RouteErrorBoundary>
  );
}
