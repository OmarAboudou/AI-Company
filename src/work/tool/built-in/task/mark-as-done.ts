import { z } from "zod"
import { defineTool } from "../../define-tool.ts"

export const taskMarkAsDoneTool = defineTool({
    description:
        "Complete your task once it is done, with a summary of what you did. Call it last, with or after the other tools your task needs: you get no turn after the one that calls it.",
    inputSchema: z.strictObject({
        summary: z.string().trim().min(1).meta({
            description:
                "What you did, in a sentence or two, e.g. Answered @director: Hono, for its Bun support.",
        }),
    }),
    execute: async ({ summary }) => ({
        text: "Task completed.",
        taskEnding: { state: "succeeded", summary },
    }),
})
