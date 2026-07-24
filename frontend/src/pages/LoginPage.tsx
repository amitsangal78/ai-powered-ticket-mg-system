import { useActionState, useEffect, type JSX } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { loginRequestSchema } from '../schemas/requests';
import { useAuthStore } from '../stores/authStore';

type LoginState = {
  error: string | null;
  ok: boolean;
};

const initialState: LoginState = { error: null, ok: false };

async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginRequestSchema.safeParse({
    email: String(formData.get('email') ?? ''),
    password: String(formData.get('password') ?? ''),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? 'Invalid credentials',
      ok: false,
    };
  }

  const success = await useAuthStore
    .getState()
    .login(parsed.data.email, parsed.data.password);
  if (!success) {
    return {
      error: useAuthStore.getState().error ?? 'Login failed',
      ok: false,
    };
  }
  return { error: null, ok: true };
}

export function LoginPage(): JSX.Element {
  const navigate = useNavigate();
  const hydrated = useAuthStore((s) => s.hydrated);
  const user = useAuthStore((s) => s.user);
  const [state, formAction, isPending] = useActionState(
    loginAction,
    initialState,
  );

  useEffect(() => {
    if (state.ok) {
      void navigate('/tickets', { replace: true });
    }
  }, [state.ok, navigate]);

  if (hydrated && user) {
    return <Navigate to="/tickets" replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Sign in</h1>
        <p className="mt-2 text-base text-gray-700">
          Use your agent or admin credentials.
        </p>

        <form action={formAction} className="mt-6 space-y-4">
          <div className="space-y-1">
            <label htmlFor="email" className="block text-sm font-medium text-gray-800">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-800"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {state.error ? (
            <p className="text-sm text-red-700" role="alert">
              {state.error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
