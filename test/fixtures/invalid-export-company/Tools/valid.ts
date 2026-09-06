import { defineTool } from "../../../../src/Tools/Tool"
import z from "zod"

export default defineTool({
    name: "valid",
    description: "a valid tool, next to an invalid one",
    parameters: z.object({}),
    execute: async () => "valid",
})
