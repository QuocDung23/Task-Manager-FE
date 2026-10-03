export const taskActivityKeys = {
  all: ["task-activities"] as const,
  list: (taskId: string) => ["task-activities", "list", taskId] as const,
};
