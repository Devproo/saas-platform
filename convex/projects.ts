import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const list = query({
  args: {
    workspaceId: v.id('workspaces'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return [];
    }

    const workspace = await ctx.db.get(args.workspaceId);

    if (!workspace || workspace.ownerId !== identity.subject) {
      return [];
    }

    return await ctx.db
      .query('projects')
      .withIndex('by_workspace', (q) => q.eq('workspaceId', args.workspaceId))
      .collect();
  },
});

export const create = mutation({
  args: {
    workspaceId: v.id('workspaces'),
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Unauthorized');

    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace || workspace.ownerId !== identity.subject) {
      throw new Error('Workspace not found or access denied');
    }

    const name = args.name.trim();
    if (name.length < 1 || name.length > 100) {
      throw new Error('Project name must be between 1 and 100 characters');
    }

    const now = Date.now();

    const individualSubscription = await ctx.db
      .query('subscriptions')
      .withIndex('by_user_scope', (q) =>
        q.eq('userId', identity.subject).eq('scope', 'individual'),
      )
      .first();

    const workspaceSubscription = await ctx.db
      .query('subscriptions')
      .withIndex('by_workspace_scope', (q) =>
        q.eq('workspaceId', args.workspaceId).eq('scope', 'workspace'),
      )
      .first();

    const hasActivePro = (subscription: typeof individualSubscription) =>
      subscription?.status === 'active' &&
      subscription.currentPeriodEnd !== undefined &&
      subscription.currentPeriodEnd > now;

    const isPro =
      hasActivePro(individualSubscription) ||
      hasActivePro(workspaceSubscription);

    const projects = await ctx.db
      .query('projects')
      .withIndex('by_workspace', (q) => q.eq('workspaceId', args.workspaceId))
      .collect();

    if (!isPro && projects.length >= 3) {
      throw new Error(
        'Free plan allows 3 projects per workspace. Upgrade to Pro to create more.',
      );
    }

    return ctx.db.insert('projects', {
      workspaceId: args.workspaceId,
      name,
      description: args.description?.trim(),
      ownerId: identity.subject,
    });
  },
});
