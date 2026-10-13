import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()

    if (!identity) {
      return []
    }

    return await ctx.db
      .query('workspaces')
      .filter((q) => q.eq(q.field('ownerId'), identity.subject))
      .collect()
  },
})

export const create = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()

    if (!identity) {
      throw new Error('Unauthenticated')
    }

    const name = args.name.trim()

    if (!name) {
      throw new Error('Workspace name is required')
    }

    return await ctx.db.insert('workspaces', {
      name,
      ownerId: identity.subject,
    })
  },
})

export const remove = mutation({
  args: {
    id: v.id('workspaces'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()

    if (!identity) {
      throw new Error('Unauthenticated')
    }

    const workspace = await ctx.db.get(args.id)

    if (!workspace || workspace.ownerId !== identity.subject) {
      throw new Error('Workspace not found or unauthorized')
    }

    await ctx.db.delete(args.id)
  },
})