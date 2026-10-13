export const PLAN_LIMITS = {
  free: {
    workspaces: 1,
    projectsPerWorkspace: 3,
    tasksPerProject: 20,
  },
  pro: {
    workspaces: Infinity,
    projectsPerWorkspace: Infinity,
    tasksPerProject: Infinity,
  },
} as const;

export type PlanKey = keyof typeof PLAN_LIMITS;

export function getPlanLimits(plan: PlanKey) {
  return PLAN_LIMITS[plan];
}
