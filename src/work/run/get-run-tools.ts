import type { BoundToolInputs } from "../task-type/define-task-type.ts"
import { bindTool } from "../tool/bind-tool.ts"
import {
    type BuiltInToolName,
    builtInTools,
} from "../tool/built-in/built-in.ts"
import type { Tool } from "../tool/define-tool.ts"

// Every run can end its task, whichever tools its type gives.
const taskEndingToolNames: BuiltInToolName[] = [
    "task_mark-as-done",
    "task_mark-as-failed",
]

export function getRunTools(
    toolNames: BuiltInToolName[],
    boundToolInputs: BoundToolInputs = {},
): Record<string, Tool> {
    return Object.fromEntries(
        [...toolNames, ...taskEndingToolNames].map((name) => {
            const tool: Tool = builtInTools[name]
            return [name, bindTool(tool, boundToolInputs[name] ?? {})]
        }),
    )
}
