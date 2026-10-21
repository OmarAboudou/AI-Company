import { z } from "zod"
import { defineTool } from "../../define-tool.ts"

export const taskMarkAsDoneTool = defineTool({
    description:
        "Mark your task as done once you have finished it, with a summary of what you did for whoever reviews your work. Call it last, with or after the other tools your task needs: you get no turn after the one that calls it.",
    inputSchema: z.strictObject({
        summary: z.string().trim().min(1).meta({
            description:
                "What you did, in a sentence or two, e.g. Answered @director: Hono, for its Bun support.",
        }),
    }),
    execute: async ({ summary }) => ({
        text: "Task marked as done.",
        taskEnding: { state: "done", summary },
    }),
})
