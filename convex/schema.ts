import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  workspaces: defineTable({
    name: v.string(),
    ownerId: v.string(),
  }).index('by_owner', ['ownerId']),

  projects: defineTable({
    workspaceId: v.id('workspaces'),
    name: v.string(),
    description: v.optional(v.string()),
    ownerId: v.string(),
  })
    .index('by_workspace', ['workspaceId'])
    .index('by_owner', ['ownerId']),

  tasks: defineTable({
    projectId: v.id('projects'),
    workspaceId: v.id('workspaces'),
    title: v.string(),
    status: v.union(
      v.literal('todo'),
      v.literal('in_progress'),
      v.literal('done'),
    ),
    ownerId: v.string(),
    dueDate: v.optional(v.number()),
  }).index('by_project', ['projectId']),

  // Only paid subscriptions are stored.
  // No active Pro subscription means the account uses the Free plan.
  subscriptions: defineTable({
    scope: v.union(v.literal('individual'), v.literal('workspace')),

    userId: v.string(),
    workspaceId: v.optional(v.id('workspaces')),

    planKey: v.literal('pro'),

    status: v.union(
      v.literal('incomplete'),
      v.literal('active'),
      v.literal('past_due'),
      v.literal('canceled'),
    ),

    provider: v.optional(v.union(v.literal('paypal'), v.literal('paystack'))),

    providerCustomerId: v.optional(v.string()),
    providerSubscriptionId: v.optional(v.string()),

    currentPeriodStart: v.optional(v.number()),
    currentPeriodEnd: v.optional(v.number()),
    cancelAtPeriodEnd: v.optional(v.boolean()),
  })
    .index('by_user_scope', ['userId', 'scope'])
    .index('by_workspace_scope', ['workspaceId', 'scope']),
});
