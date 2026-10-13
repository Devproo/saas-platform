'use client'

import { useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'

export default function DashboardPage() {
  const { user, isLoaded } = useUser()
  const workspaces = useQuery(api.workspaces.list)
  const createWorkspace = useMutation(api.workspaces.create)
const deleteWorkspace = useMutation(api.workspaces.remove)
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      await createWorkspace({ name })
      setName('')
    } catch {
      setError('Could not create workspace. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (!isLoaded || workspaces === undefined) {
    return <p className="p-8">Loading...</p>
  }

  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="text-3xl font-bold">SaaS Dashboard</h1>

      <p className="mt-2 text-gray-600">
        Welcome,{' '}
        {user?.firstName ??
          user?.emailAddresses[0]?.emailAddress ??
          'User'}
        !
      </p>

      <section className="mt-8 rounded-lg border p-6">
        <h2 className="text-xl font-semibold">Create a workspace</h2>

        <form onSubmit={handleCreate} className="mt-4 flex gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Workspace name"
            required
            maxLength={80}
            className="min-w-0 flex-1 rounded-md border px-3 py-2"
          />

          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="rounded-md bg-purple-700 px-4 py-2 text-white disabled:opacity-50"
          >
            {saving ? 'Creating...' : 'Create'}
          </button>
        </form>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </section>

      <section className="mt-8 rounded-lg border p-6">
        <h2 className="text-xl font-semibold">Your workspaces</h2>

        {workspaces.length === 0 ? (
          <p className="mt-2 text-gray-500">No workspaces yet.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {workspaces.map((workspace) => (

             
          <li
  key={workspace._id}
  className="flex items-center justify-between rounded-md border p-3"
>
  <span>{workspace.name}</span>
  <button
    type="button"
         onClick={() => {
      if (window.confirm(`Delete "${workspace.name}"?`)) {
        void deleteWorkspace({ id: workspace._id })
      }
    }}
             className="text-sm text-red-600 hover:underline"
  >
    Delete
     </button>
</li>

            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
