import z from "zod"

export interface ToolDefinition
<
    TParams extends z.ZodType = z.ZodType, 
    TResult = unknown
>
{
    name: string;
    description: string;
    parameters: TParams;
    execute(params: z.infer<TParams>) : Promise<TResult>;
    resultToMarkdown?(result: TResult) : string;
}

const ToolDefinitionSchema: z.ZodType<ToolDefinition> = z.object({
    name: z.string(),
    description: z.string(),
    parameters: z.instanceof(z.ZodType),
    execute: z.custom<ToolDefinition['execute']>((v) => typeof v === "function"),
    resultToMarkdown: z.custom<NonNullable<ToolDefinition['resultToMarkdown']>>((v) => typeof v === "function").optional()
})

export function defineTool<TParams extends z.ZodType, TResult>(
    definition: ToolDefinition<TParams, TResult>
) : ToolDefinition<TParams, TResult>
{
    return definition
}

export function isToolDefinition(value: unknown) : value is ToolDefinition{
    return ToolDefinitionSchema.safeParse(value).success
}