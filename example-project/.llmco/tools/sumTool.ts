import { defineTool, z } from "@/tool";

const sumToolInput = z.object({
    numbers: z.array(z.number()).describe("An array of numbers to sum"),
})

const sumToolOutput = z.number().describe("The sum of the numbers");

const t = defineTool(
    {
        name: "Sum",
        description: "A simple tool that sum numbers",
        inputSchema: sumToolInput,
        outputSchema: sumToolOutput,
        execute: async (params) => {
            const sum = params.numbers.reduce((acc, curr) => acc + curr, 0);
            return sum;
        },
    }
)