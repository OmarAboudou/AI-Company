import { z } from "zod"
import { defineTool } from "../../define-tool.ts"

export const taskMarkAsFailedTool = defineTool({
    description:
        "Mark your task as failed when you can't do it, saying why, so that someone can act on it. You get no turn after the one that calls it.",
    inputSchema: z.strictObject({
        reason: z.string().trim().min(1).meta({
            description:
                "Why you can't do the task, e.g. The thread asks for a budget I have no figures for.",
        }),
    }),
    execute: async ({ reason }) => ({
        text: "Task marked as failed.",
        taskEnding: { state: "failed", reason },
    }),
})
