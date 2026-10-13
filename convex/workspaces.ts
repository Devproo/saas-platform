import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return [];
    }

    return await ctx.db
      .query('workspaces')
      .filter((q) => q.eq(q.field('ownerId'), identity.subject))
      .collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error('Unauthenticated');
    }

    const name = args.name.trim();

    if (!name || name.length > 80) {
      throw new Error('Name must be between 1 and 80 characters');
    }

    const subscription = await ctx.db
      .query('subscriptions')
      .withIndex('by_user_scope', (q) =>
        q.eq('userId', identity.subject).eq('scope', 'individual'),
      )
      .first();

    const isPro =
      subscription?.status === 'active' &&
      subscription.currentPeriodEnd !== undefined &&
      subscription.currentPeriodEnd > Date.now();

    const workspaceCount = await ctx.db
      .query('workspaces')
      .withIndex('by_owner', (q) => q.eq('ownerId', identity.subject))
      .collect();

    if (!isPro && workspaceCount.length >= 1) {
      throw new Error(
        'Free plan allows one workspace. Upgrade to Pro to create more.',
      );
    }

    return await ctx.db.insert('workspaces', {
      name,
      ownerId: identity.subject,
    });
  },
});
export const remove = mutation({
  args: {
    id: v.id('workspaces'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error('Unauthenticated');
    }

    const workspace = await ctx.db.get(args.id);

    if (!workspace || workspace.ownerId !== identity.subject) {
      throw new Error('Workspace not found or unauthorized');
    }

    await ctx.db.delete(args.id);
  },
});

export const rename = mutation({
  args: {
    id: v.id('workspaces'),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error('Unauthenticated');
    }

    const workspace = await ctx.db.get(args.id);

    if (!workspace || workspace.ownerId !== identity.subject) {
      throw new Error('Workspace not found or unauthorized');
    }

    const name = args.name.trim();

    if (!name || name.length > 80) {
      throw new Error('Name must be between 1 and 80 characters');
    }

    await ctx.db.patch(args.id, { name });
  },
});
