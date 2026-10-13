'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const workspaces = useQuery(api.workspaces.list);
  const createWorkspace = useMutation(api.workspaces.create);
  const deleteWorkspace = useMutation(api.workspaces.remove);
  const renameWorkspace = useMutation(api.workspaces.rename);

  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const individualPlan = useQuery(api.subscriptions.getIndividualPlan);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      await createWorkspace({ name });
      setName('');
    } catch {
      setError('Could not create workspace. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleRename(
    id: typeof workspaces extends (infer T)[] | undefined
      ? T extends { _id: infer I }
        ? I
        : never
      : never,
  ) {
    setError('');
    setSaving(true);

    try {
      await renameWorkspace({ id, name: editName });
      setEditingId(null);
      setEditName('');
    } catch {
      setError('Could not rename workspace. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(
    id: typeof workspaces extends (infer T)[] | undefined
      ? T extends { _id: infer I }
        ? I
        : never
      : never,
    workspaceName: string,
  ) {
    if (!window.confirm(`Delete "${workspaceName}"?`)) return;

    setError('');

    try {
      await deleteWorkspace({ id });
    } catch {
      setError('Could not delete workspace. Please try again.');
    }
  }

  if (!isLoaded || workspaces === undefined) {
    return <p className='p-8'>Loading...</p>;
  }

  return (
    <main className='mx-auto max-w-4xl p-8'>
      <h1 className='text-3xl font-bold'>SaaS Dashboard</h1>

      <p className='mt-2 text-gray-600'>
        Welcome,{' '}
        {user?.firstName ?? user?.emailAddresses[0]?.emailAddress ?? 'User'}!
      </p>

      <section className='mt-6 rounded-lg border p-5'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <h2 className='text-lg font-semibold'>Your Plan</h2>
            <p className='mt-1 text-sm text-gray-600'>
              {individualPlan === undefined
                ? 'Loading plan...'
                : individualPlan.plan === 'pro'
                  ? 'Pro — unlimited tasks and projects'
                  : 'Free — 1 workspace, 3 projects per workspace, 20 tasks per project'}
            </p>
          </div>

          <span className='rounded-full border px-3 py-1 text-sm font-medium'>
            {individualPlan === undefined
              ? 'Loading'
              : individualPlan.plan === 'pro'
                ? 'Pro'
                : 'Free'}
          </span>

          <Link
            href='/pricing'
            className='rounded-md bg-purple-700 px-4 py-2 text-white hover:bg-purple-800'
          >
            View Plans
          </Link>
        </div>
      </section>

      <section className='mt-8 rounded-lg border p-6'>
        <h2 className='text-xl font-semibold'>Create a workspace</h2>

        <form
          onSubmit={handleCreate}
          className='mt-4 flex gap-3'
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder='Workspace name'
            required
            maxLength={80}
            className='min-w-0 flex-1 rounded-md border px-3 py-2'
          />

          <button
            type='submit'
            disabled={saving || !name.trim()}
            className='rounded-md bg-purple-700 px-4 py-2 text-white disabled:opacity-50'
          >
            {saving ? 'Creating...' : 'Create'}
          </button>
        </form>
      </section>

      {error && (
        <p
          role='alert'
          className='mt-4 text-sm text-red-600'
        >
          {error}
        </p>
      )}

      <section className='mt-8 rounded-lg border p-6'>
        <h2 className='text-xl font-semibold'>Your workspaces</h2>

        {workspaces.length === 0 ? (
          <p className='mt-2 text-gray-500'>No workspaces yet.</p>
        ) : (
          <ul className='mt-4 space-y-3'>
            {workspaces.map((workspace) => (
              <li
                key={workspace._id}
                className='rounded-md border p-3'
              >
                {editingId === workspace._id ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void handleRename(workspace._id);
                    }}
                    className='flex flex-wrap gap-2'
                  >
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                      maxLength={80}
                      autoFocus
                      className='min-w-0 flex-1 rounded-md border px-3 py-2'
                    />

                    <button
                      type='submit'
                      disabled={saving || !editName.trim()}
                      className='rounded-md bg-purple-700 px-3 py-2 text-white disabled:opacity-50'
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>

                    <button
                      type='button'
                      onClick={() => {
                        setEditingId(null);
                        setEditName('');
                        setError('');
                      }}
                      className='rounded-md border px-3 py-2'
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <div className='flex flex-wrap items-center justify-between gap-3'>
                    <Link
                      href={`/workspaces/${workspace._id}`}
                      className='font-medium text-purple-700 hover:underline'
                    >
                      {workspace.name}
                    </Link>

                    <div className='flex gap-4'>
                      <button
                        type='button'
                        onClick={() => {
                          setEditingId(workspace._id);
                          setEditName(workspace.name);
                          setError('');
                        }}
                        className='text-sm text-purple-700 hover:underline'
                      >
                        Rename
                      </button>

                      <button
                        type='button'
                        onClick={() => {
                          void handleDelete(workspace._id, workspace.name);
                        }}
                        className='text-sm text-red-600 hover:underline'
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
