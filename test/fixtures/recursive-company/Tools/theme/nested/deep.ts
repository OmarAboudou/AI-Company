import {defineTool} from "../../../../../../src/Tools/Tool"
import z from "zod"

export default defineTool({
    name: "deep",
    description: "a tool two directories below Tools/",
    parameters: z.object({}),
    execute: async () => "deep"
})
