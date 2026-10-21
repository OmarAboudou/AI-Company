import { z } from "zod"
import { defineTool } from "../../define-tool.ts"

export const taskCompleteTool = defineTool({
    description:
        "Complete your task once it is done, with a summary of what you did. Your run ends with the turn that calls it: call it last, once every other tool of your work has run.",
    inputSchema: z.strictObject({
        summary: z.string().trim().min(1).meta({
            description:
                "What you did, in a sentence or two, e.g. Answered @director: Hono, for its Bun support.",
        }),
    }),
    execute: async ({ summary }) => ({
        text: "Your task is completed: your run ends here.",
        taskEnding: { state: "succeeded", summary },
    }),
})
