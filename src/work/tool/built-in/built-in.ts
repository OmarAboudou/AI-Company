import type { Tool } from "../define-tool.ts"
import { messageSendTool } from "./message/send.ts"
import { taskCompleteTool } from "./task/complete.ts"
import { taskFailTool } from "./task/fail.ts"
import { threadShowTool } from "./thread/show.ts"

export const builtInTools = {
    message_send: messageSendTool,
    task_complete: taskCompleteTool,
    task_fail: taskFailTool,
    thread_show: threadShowTool,
} satisfies Record<string, Tool>

export type BuiltInToolName = keyof typeof builtInTools
