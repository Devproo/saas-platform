import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const list = query({
  args: {
    projectId: v.id('projects'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) return [];

    const project = await ctx.db.get(args.projectId);

    if (!project || project.ownerId !== identity.subject) {
      return [];
    }

    return await ctx.db
      .query('tasks')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .collect();
  },
});

export const create = mutation({
  args: {
    projectId: v.id('projects'),
    title: v.string(),
    dueDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error('Unauthenticated');
    }

    const project = await ctx.db.get(args.projectId);

    if (!project || project.ownerId !== identity.subject) {
      throw new Error('Project not found or unauthorized');
    }

    const title = args.title.trim();

    if (!title || title.length > 200) {
      throw new Error('Task title must be between 1 and 200 characters');
    }

    const workspace = await ctx.db.get(project.workspaceId);

    if (!workspace || workspace.ownerId !== identity.subject) {
      throw new Error('Workspace not found or unauthorized');
    }

    const individualSubscription = await ctx.db
      .query('subscriptions')
      .withIndex('by_user_scope', (q) =>
        q.eq('userId', identity.subject).eq('scope', 'individual'),
      )
      .first();

    const workspaceSubscription = await ctx.db
      .query('subscriptions')
      .withIndex('by_workspace_scope', (q) =>
        q.eq('workspaceId', project.workspaceId).eq('scope', 'workspace'),
      )
      .first();

    const now = Date.now();

    const hasActivePro = (
      subscription: {
        status: 'incomplete' | 'active' | 'past_due' | 'canceled';
        currentPeriodEnd?: number;
      } | null,
    ) =>
      subscription?.status === 'active' &&
      subscription.currentPeriodEnd !== undefined &&
      subscription.currentPeriodEnd > now;

    const isPro =
      hasActivePro(individualSubscription) ||
      hasActivePro(workspaceSubscription);

    const tasks = await ctx.db
      .query('tasks')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .collect();

    if (!isPro && tasks.length >= 20) {
      throw new Error(
        'Free plan allows 20 tasks per project. Upgrade to Pro for unlimited tasks.',
      );
    }

    return await ctx.db.insert('tasks', {
      projectId: args.projectId,
      workspaceId: project.workspaceId,
      title,
      status: 'todo',
      ownerId: identity.subject,
      dueDate: args.dueDate,
    });
  },
});
export const updateStatus = mutation({
  args: {
    taskId: v.id('tasks'),
    status: v.union(
      v.literal('todo'),
      v.literal('in_progress'),
      v.literal('done'),
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Unauthorized');

    const task = await ctx.db.get(args.taskId);
    if (!task || task.ownerId !== identity.subject) {
      throw new Error('Task not found');
    }

    await ctx.db.patch(args.taskId, { status: args.status });
  },
});

export const remove = mutation({
  args: {
    taskId: v.id('tasks'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Unauthorized');

    const task = await ctx.db.get(args.taskId);
    if (!task || task.ownerId !== identity.subject) {
      throw new Error('Task not found');
    }

    await ctx.db.delete(args.taskId);
  },
});

export const update = mutation({
  args: {
    taskId: v.id('tasks'),
    title: v.string(),
    dueDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Unauthenticated');

    const task = await ctx.db.get(args.taskId);
    if (!task || task.ownerId !== identity.subject) {
      throw new Error('Task not found or unauthorized');
    }

    const title = args.title.trim();
    if (!title || title.length > 200) {
      throw new Error('Task title must be between 1 and 200 characters');
    }

    await ctx.db.patch(args.taskId, {
      title,
      dueDate: args.dueDate,
    });
  },
});
