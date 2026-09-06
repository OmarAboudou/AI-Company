import { defineTool } from "../../src/Tools/Tool"
import z from "zod"

export default defineTool({
    name: "example",
    description: "example tool",
    parameters: z.object({
        x: z.number(),
    }),
    execute: async ({ x }) => {
        return `example tool was called with x = ${x}`
    },
})
