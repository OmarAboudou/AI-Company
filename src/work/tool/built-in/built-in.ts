import type { Tool } from "../define-tool.ts"
import { messageSendTool } from "./message/send.ts"
import { taskMarkAsDoneTool } from "./task/mark-as-done.ts"
import { taskMarkAsFailedTool } from "./task/mark-as-failed.ts"
import { threadShowTool } from "./thread/show.ts"

export const builtInTools = {
    message_send: messageSendTool,
    "task_mark-as-done": taskMarkAsDoneTool,
    "task_mark-as-failed": taskMarkAsFailedTool,
    thread_show: threadShowTool,
} satisfies Record<string, Tool>

export type BuiltInToolName = keyof typeof builtInTools
