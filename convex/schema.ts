import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  workspaces: defineTable({
    name: v.string(),
    ownerId: v.string(),
  }),
})