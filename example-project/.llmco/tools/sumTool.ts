import z from "zod"
import { defineTool } from "@/tool";

const sumToolInput = z.object({
    numbers: z.array(z.number()).describe("An array of numbers to add"),
})

const sumToolOutput = z.number().describe("The sum of the numbers");

export const sumToolDef = defineTool(
    {
        name: "Sum",
        description: "A simple tool that add numbers",
        inputSchema: sumToolInput,
        outputSchema: sumToolOutput,
        execute: async (params) => {
            const sum = params.numbers.reduce((acc, curr) => acc + curr, 0);
            return sum;
        },
    }
)