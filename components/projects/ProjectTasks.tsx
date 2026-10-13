'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';

function toDateInputValue(timestamp: number) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function ProjectTasks({ projectId }: { projectId: Id<'projects'> }) {
  const tasks = useQuery(api.tasks.list, { projectId });
  const createTask = useMutation(api.tasks.create);
  const updateTask = useMutation(api.tasks.update);
  const updateStatus = useMutation(api.tasks.updateStatus);
  const removeTask = useMutation(api.tasks.remove);

  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [editingTaskId, setEditingTaskId] = useState<Id<'tasks'> | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editError, setEditError] = useState('');
  const [updating, setUpdating] = useState(false);

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      await createTask({
        projectId,
        title,
        dueDate: dueDate
          ? new Date(`${dueDate}T00:00:00`).getTime()
          : undefined,
      });

      setTitle('');
      setDueDate('');
    } catch {
      setError('Could not create task. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function startEditing(task: {
    _id: Id<'tasks'>;
    title: string;
    dueDate?: number;
  }) {
    setEditingTaskId(task._id);
    setEditTitle(task.title);
    setEditDueDate(task.dueDate ? toDateInputValue(task.dueDate) : '');
    setEditError('');
  }

  function cancelEditing() {
    setEditingTaskId(null);
    setEditTitle('');
    setEditDueDate('');
    setEditError('');
  }

  async function handleUpdate(
    e: FormEvent<HTMLFormElement>,
    taskId: Id<'tasks'>,
  ) {
    e.preventDefault();
    setEditError('');
    setUpdating(true);

    try {
      await updateTask({
        taskId,
        title: editTitle,
        dueDate: editDueDate
          ? new Date(`${editDueDate}T00:00:00`).getTime()
          : undefined,
      });

      cancelEditing();
    } catch {
      setEditError('Could not update task. Please try again.');
    } finally {
      setUpdating(false);
    }
  }

  async function handleDelete(taskId: Id<'tasks'>) {
    try {
      await removeTask({ taskId });

      if (editingTaskId === taskId) {
        cancelEditing();
      }
    } catch {
      setError('Could not delete task. Please try again.');
    }
  }

  return (
    <div className='mt-4 border-t pt-4'>
      <h4 className='font-medium'>Tasks</h4>

      <form
        onSubmit={handleCreate}
        className='mt-3 flex flex-wrap gap-2'
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder='New task'
          required
          maxLength={200}
          className='min-w-0 flex-1 rounded-md border px-3 py-2'
        />

        <input
          type='date'
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className='rounded-md border px-3 py-2'
        />

        <button
          type='submit'
          disabled={saving || !title.trim()}
          className='rounded-md bg-purple-700 px-3 py-2 text-white disabled:opacity-50'
        >
          {saving ? 'Adding...' : 'Add task'}
        </button>
      </form>

      {error && (
        <p
          role='alert'
          className='mt-2 text-sm text-red-600'
        >
          {error}
        </p>
      )}

      {tasks === undefined ? (
        <p className='mt-3 text-sm text-gray-500'>Loading tasks...</p>
      ) : tasks.length === 0 ? (
        <p className='mt-3 text-sm text-gray-500'>No tasks yet.</p>
      ) : (
        <ul className='mt-3 space-y-2'>
          {tasks.map((task) => (
            <li
              key={task._id}
              className='rounded-md bg-gray-50 p-3 text-sm'
            >
              {editingTaskId === task._id ? (
                <form
                  onSubmit={(e) => handleUpdate(e, task._id)}
                  className='space-y-3'
                >
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder='Task title'
                    required
                    maxLength={200}
                    className='w-full rounded-md border px-3 py-2'
                  />

                  <input
                    type='date'
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className='rounded-md border px-3 py-2'
                  />

                  {editError && (
                    <p
                      role='alert'
                      className='text-red-600'
                    >
                      {editError}
                    </p>
                  )}

                  <div className='flex gap-2'>
                    <button
                      type='submit'
                      disabled={updating || !editTitle.trim()}
                      className='rounded-md bg-purple-700 px-3 py-1.5 text-white disabled:opacity-50'
                    >
                      {updating ? 'Saving...' : 'Save'}
                    </button>

                    <button
                      type='button'
                      onClick={cancelEditing}
                      disabled={updating}
                      className='rounded-md border px-3 py-1.5'
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className='flex flex-wrap items-center justify-between gap-3'>
                  <div className='min-w-0 flex-1'>
                    <p>{task.title}</p>

                    {task.dueDate && (
                      <p className='mt-1 text-xs text-gray-500'>
                        Due: {new Date(task.dueDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  <div className='flex flex-wrap items-center gap-2'>
                    <select
                      value={task.status}
                      onChange={(e) =>
                        updateStatus({
                          taskId: task._id,
                          status: e.target.value as
                            'todo' | 'in_progress' | 'done',
                        })
                      }
                      className='rounded-md border px-2 py-1'
                      aria-label={`Status for ${task.title}`}
                    >
                      <option value='todo'>To do</option>
                      <option value='in_progress'>In progress</option>
                      <option value='done'>Done</option>
                    </select>

                    <button
                      type='button'
                      onClick={() => startEditing(task)}
                      className='text-purple-700 hover:underline'
                    >
                      Edit
                    </button>

                    <button
                      type='button'
                      onClick={() => handleDelete(task._id)}
                      className='text-red-600 hover:underline'
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
    </div>
  );
}
