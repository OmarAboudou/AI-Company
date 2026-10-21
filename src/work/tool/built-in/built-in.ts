import type { Tool } from "../define-tool.ts"
import { taskCompleteTool } from "./task/complete.ts"
import { taskFailTool } from "./task/fail.ts"

export const builtInTools: Record<string, Tool> = {
    task_complete: taskCompleteTool,
    task_fail: taskFailTool,
}
