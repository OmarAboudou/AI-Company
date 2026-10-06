import z from "zod";
export { z };

interface Tool<TInput extends z.ZodType = z.ZodVoid, TOutput extends z.ZodType = z.ZodString> {
    name: string;
    description: string;
    inputSchema: TInput;
    outputSchema: TOutput;
    execute: (params: z.infer<TInput>) => Promise<z.infer<TOutput>>;
}

export function defineTool<TInput extends z.ZodType = z.ZodVoid, TOutput extends z.ZodType = z.ZodString>(
    definition: Tool<TInput, TOutput>
){
    return definition;
}