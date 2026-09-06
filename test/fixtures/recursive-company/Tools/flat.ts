import { defineTool } from "../../../../src/Tools/Tool"
import z from "zod"

export default defineTool({
    name: "flat",
    description: "a tool at the root of Tools/",
    parameters: z.object({}),
    execute: async () => "flat",
})
