import {
  useOptimistic,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type JSX,
} from 'react';
import type { Comment } from '../schemas/domain';
import { createCommentRequestSchema } from '../schemas/requests';
import { useTicketStore } from '../stores/ticketStore';
import { useAuthStore } from '../stores/authStore';

type Props = {
  ticketId: string;
  comments: Comment[];
};

type OptimisticComment = Comment & { pending?: boolean };

export function CommentForm({ ticketId, comments }: Props): JSX.Element {
  const addComment = useTicketStore((s) => s.addComment);
  const userId = useAuthStore((s) => s.user?.id);
  const [optimisticComments, addOptimistic] = useOptimistic(
    comments as OptimisticComment[],
    (current, next: OptimisticComment) => [...current, next],
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const message = String(formData.get('message') ?? '');
    const parsed = createCommentRequestSchema.safeParse({ message });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid comment');
      return;
    }
    if (!userId) {
      setError('Not authenticated');
      return;
    }

    setError(null);
    const temp: OptimisticComment = {
      id: crypto.randomUUID(),
      ticketId,
      message: parsed.data.message,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      pending: true,
    };

    startTransition(async () => {
      addOptimistic(temp);
      const created = await addComment(ticketId, parsed.data.message);
      if (!created) {
        setError('Failed to add comment');
        return;
      }
      formRef.current?.reset();
    });
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold text-gray-900">Comments</h3>
      <ul className="space-y-3">
        {optimisticComments.map((c) => (
          <li
            key={c.id}
            className={`rounded-lg border border-gray-200 bg-white p-4 shadow-sm ${
              c.pending ? 'opacity-60' : ''
            }`}
          >
            <p className="text-base text-gray-700">{c.message}</p>
            <p className="mt-1 text-sm text-gray-600">
              {new Date(c.createdAt).toLocaleString()}
              {c.pending ? ' · Sending…' : ''}
            </p>
          </li>
        ))}
        {optimisticComments.length === 0 ? (
          <li className="text-sm text-gray-600">No comments yet.</li>
        ) : null}
      </ul>

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
        <label htmlFor="comment-message" className="block text-sm font-medium text-gray-800">
          Add a comment
        </label>
        <textarea
          id="comment-message"
          name="message"
          rows={3}
          required
          maxLength={2000}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {error ? (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? 'Posting…' : 'Post comment'}
        </button>
      </form>
    </div>
  );
}
