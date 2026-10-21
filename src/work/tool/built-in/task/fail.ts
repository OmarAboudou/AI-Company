import { z } from "zod"
import { defineTool } from "../../define-tool.ts"

export const taskFailTool = defineTool({
    description:
        "Give your task up when you can't do it, with the reason why, so that whoever reads the company's journal can act on it. Your run ends with the turn that calls it.",
    inputSchema: z.strictObject({
        reason: z.string().trim().min(1).meta({
            description:
                "Why you can't do the task, e.g. The thread asks for a budget I have no figures for.",
        }),
    }),
    execute: async ({ reason }) => ({
        text: "Your task is given up: your run ends here.",
        taskEnding: { state: "failed", reason },
    }),
})
