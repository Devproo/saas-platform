'use client';
import { ProjectTasks } from '@/components/projects/ProjectTasks';
import Link from 'next/link';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';

export default function WorkspacePage() {
  const params = useParams<{ workspacesId: string }>();
  const workspaceId = params.workspacesId as Id<'workspaces'>;

  const workspacePlan = useQuery(api.subscriptions.getWorkspacePlan, {
    workspaceId,
  });

  const projects = useQuery(api.projects.list, { workspaceId });
  const createProject = useMutation(api.projects.create);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      await createProject({
        workspaceId,
        name,
        description: description.trim() || undefined,
      });
      setName('');
      setDescription('');
    } catch {
      setError('Could not create project. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className='mx-auto max-w-4xl p-8'>
      <Link
        href='/dashboard'
        className='text-sm text-purple-700 hover:underline'
      >
        ← Back to dashboard
      </Link>

      <h1 className='mt-4 text-3xl font-bold'>Workspace Projects</h1>

      <section className='mt-6 rounded-lg border p-5'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <h2 className='text-lg font-semibold'>Workspace Plan</h2>
            <p className='mt-1 text-sm text-gray-600'>
              {workspacePlan === undefined
                ? 'Loading plan...'
                : workspacePlan.plan === 'pro'
                  ? 'Pro — unlimited projects and tasks'
                  : 'Free — 3 projects and 20 tasks per project'}
            </p>
          </div>

          <span className='rounded-full border px-3 py-1 text-sm font-medium'>
            {workspacePlan === undefined
              ? 'Loading'
              : workspacePlan.plan === 'pro'
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
        <h2 className='text-xl font-semibold'>Create a project</h2>

        <form
          onSubmit={handleCreate}
          className='mt-4 space-y-3'
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder='Project name'
            required
            maxLength={100}
            className='w-full rounded-md border px-3 py-2'
          />

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder='Description (optional)'
            className='w-full rounded-md border px-3 py-2'
            rows={3}
          />

          <button
            type='submit'
            disabled={saving || !name.trim()}
            className='rounded-md bg-purple-700 px-4 py-2 text-white disabled:opacity-50'
          >
            {saving ? 'Creating...' : 'Create project'}
          </button>
        </form>

        {error && (
          <p
            role='alert'
            className='mt-3 text-sm text-red-600'
          >
            {error}
          </p>
        )}
      </section>

      <section className='mt-8 rounded-lg border p-6'>
        <h2 className='text-xl font-semibold'>Projects</h2>

        {projects === undefined ? (
          <p className='mt-3 text-gray-500'>Loading projects...</p>
        ) : projects.length === 0 ? (
          <p className='mt-3 text-gray-500'>No projects yet.</p>
        ) : (
          <ul className='mt-4 space-y-3'>
            {projects.map((project) => (
              <li
                key={project._id}
                className='rounded-md border p-4'
              >
                <h3 className='font-semibold'>{project.name}</h3>
                {project.description && (
                  <p className='mt-1 text-sm text-gray-600'>
                    {project.description}
                  </p>
                )}
                <ProjectTasks projectId={project._id} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
