import { internalMutation, query } from './_generated/server';
import { v } from 'convex/values';

function hasActiveProSubscription(
  subscription: {
    status: 'incomplete' | 'active' | 'past_due' | 'canceled';
    currentPeriodEnd?: number;
  } | null,
) {
  return (
    subscription?.status === 'active' &&
    subscription.currentPeriodEnd !== undefined &&
    subscription.currentPeriodEnd > Date.now()
  );
}

export const getIndividualPlan = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      return { plan: 'free' as const };
    }

    const subscription = await ctx.db
      .query('subscriptions')
      .withIndex('by_user_scope', (q) =>
        q.eq('userId', identity.subject).eq('scope', 'individual'),
      )
      .first();

    return {
      plan: hasActiveProSubscription(subscription) ? 'pro' : 'free',
    };
  },
});

export const getWorkspacePlan = query({
  args: {
    workspaceId: v.id('workspaces'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error('Unauthenticated');
    }

    const workspace = await ctx.db.get(args.workspaceId);

    if (!workspace || workspace.ownerId !== identity.subject) {
      throw new Error('Workspace not found or unauthorized');
    }

    const subscription = await ctx.db
      .query('subscriptions')
      .withIndex('by_workspace_scope', (q) =>
        q.eq('workspaceId', args.workspaceId).eq('scope', 'workspace'),
      )
      .first();

    return {
      plan: hasActiveProSubscription(subscription) ? 'pro' : 'free',
    };
  },
});

export const activateIndividualPro = internalMutation({
  args: {
    userId: v.string(),
    providerSubscriptionId: v.string(),
    currentPeriodStart: v.number(),
    currentPeriodEnd: v.number(),
  },
  handler: async (ctx, args) => {
    if (
      !args.userId.trim() ||
      !args.providerSubscriptionId.trim() ||
      args.currentPeriodEnd <= args.currentPeriodStart ||
      args.currentPeriodEnd <= Date.now()
    ) {
      throw new Error('Invalid subscription details');
    }

    const existing = await ctx.db
      .query('subscriptions')
      .withIndex('by_user_scope', (q) =>
        q.eq('userId', args.userId).eq('scope', 'individual'),
      )
      .first();

    const values = {
      scope: 'individual' as const,
      userId: args.userId,
      planKey: 'pro' as const,
      status: 'active' as const,
      provider: 'paypal' as const,
      providerSubscriptionId: args.providerSubscriptionId,
      currentPeriodStart: args.currentPeriodStart,
      currentPeriodEnd: args.currentPeriodEnd,
      cancelAtPeriodEnd: false,
    };

    if (existing) {
      await ctx.db.patch(existing._id, values);
    } else {
      await ctx.db.insert('subscriptions', values);
    }

    return { plan: 'pro' as const };
  },
});
