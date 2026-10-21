import type { ToolDefinition } from "../../../llm/conversation/schema.ts"
import { UserError } from "../../../user-error.ts"

export type ToolInputQuestion = { message: string; isRequired: boolean }

export type ToolInputPrompts = {
    askLine(question: ToolInputQuestion): Promise<string>
    askText(question: ToolInputQuestion): Promise<string>
    askNumber(
        question: ToolInputQuestion & { isInteger: boolean; min?: number },
    ): Promise<number | undefined>
    askYesNo(question: ToolInputQuestion): Promise<boolean>
}

type InputProperty = {
    type?: string
    description?: string
    contentMediaType?: string
    minimum?: number
}

type InputToAsk = {
    toolName: string
    name: string
    property: InputProperty
    isRequired: boolean
}

function formatQuestionMessage({
    name,
    property,
    isRequired,
}: InputToAsk): string {
    const label = isRequired ? name : `${name} (optional)`
    const { description } = property
    return description === undefined ? label : `${label}: ${description}`
}

async function askInputValue(
    inputToAsk: InputToAsk,
    prompts: ToolInputPrompts,
): Promise<unknown> {
    const { toolName, name, property, isRequired } = inputToAsk
    const question = {
        message: formatQuestionMessage(inputToAsk),
        isRequired,
    }
    switch (property.type) {
        case "string": {
            const answer =
                property.contentMediaType === "text/markdown"
                    ? await prompts.askText(question)
                    : await prompts.askLine(question)
            return answer === "" && !isRequired ? undefined : answer
        }
        case "integer":
        case "number":
            return prompts.askNumber({
                ...question,
                isInteger: property.type === "integer",
                ...(property.minimum !== undefined && {
                    min: property.minimum,
                }),
            })
        case "boolean":
            return prompts.askYesNo(question)
        default:
            throw new UserError(
                `${toolName} takes a ${name} that is neither a text, a number nor a yes or no, which llmco task work can't ask for: add the call with \`llmco turn add tool\`.`,
            )
    }
}

export async function askToolInput(
    { name: toolName, inputSchema }: ToolDefinition,
    prompts: ToolInputPrompts,
): Promise<Record<string, unknown>> {
    const properties = (inputSchema.properties ?? {}) as Record<
        string,
        InputProperty
    >
    const requiredNames = (inputSchema.required ?? []) as string[]
    const input: Record<string, unknown> = {}
    for (const [name, property] of Object.entries(properties)) {
        const isRequired = requiredNames.includes(name)
        const value = await askInputValue(
            { toolName, name, property, isRequired },
            prompts,
        )
        if (value !== undefined) {
            input[name] = value
        }
    }
    return input
}
