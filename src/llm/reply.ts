import type Anthropic from "@anthropic-ai/sdk"
import { projectRoot } from "../cli-helpers.ts"
import { loadCompany } from "../company/storage.ts"
import type { Employee } from "../employee/employee.ts"
import { loadEmployee } from "../employee/storage.ts"
import { UserError } from "../errors.ts"
import type { LlmModel } from "../llm-model/llm-model.ts"
import { loadLlmModel } from "../llm-model/storage.ts"
import { loadLlmProvider } from "../llm-provider/storage.ts"
import { committer } from "../message/author.ts"
import { readMentions, sendDraft } from "../message/commands.ts"
import type { Message } from "../message/message.ts"
import { listMessages, loadResponse, saveResponse } from "../message/storage.ts"
import type { Position } from "../position/position.ts"
import { loadPosition } from "../position/storage.ts"
import { loadThread } from "../thread/storage.ts"
import {
    anthropicTurns,
    callAnthropicMessages,
    type Replays,
} from "./anthropic-messages.ts"
import { readApiKey } from "./api-key.ts"
import { systemPrompt } from "./system-prompt.ts"

type LlmEmployee = Extract<Employee, { kind: "llm" }>

async function replays(
    messages: Message[],
    employee: LlmEmployee,
    model: LlmModel,
): Promise<Replays> {
    const own = messages.filter(
        (message) => message.employee?.id === employee.id,
    )
    const entries = await Promise.all(
        own.map(async (message) => {
            const response = await loadResponse(projectRoot, message)
            const sameModel =
                response?.protocol === "anthropic-messages" &&
                response.providerId === model.providerId &&
                response.apiId === model.apiId
            if (!sameModel) {
                return []
            }
            // llmco wrote it from the SDK's own response, in answerAs.
            const { content } = response.response as Anthropic.Message
            return [[message.id, content] as const]
        }),
    )
    return new Map(entries.flat())
}

async function answerAs(
    threadId: string,
    position: Position,
    employee: LlmEmployee,
): Promise<void> {
    const [company, thread, messages, provider, model] = await Promise.all([
        loadCompany(projectRoot),
        loadThread(projectRoot, threadId),
        listMessages(projectRoot, threadId),
        loadLlmProvider(projectRoot, employee.providerId),
        loadLlmModel(projectRoot, employee.providerId, employee.modelId),
    ])
    if (model.protocol !== "anthropic-messages") {
        throw new UserError(
            `Model "${model.id}" of provider "${provider.id}" is called through ${model.protocol}, which llmco can't call yet.`,
        )
    }
    const connection = provider.connections?.["anthropic-messages"]
    if (connection === undefined) {
        throw new UserError(
            `Provider "${provider.id}" has no anthropic-messages connection. Run \`llmco provider connection create\`.`,
        )
    }
    const [apiKey, ownReplays] = await Promise.all([
        readApiKey(provider),
        replays(messages, employee, model),
    ])
    console.error(
        `${employee.name} answers as ${position.title} (@${position.id}):`,
    )
    const response = await callAnthropicMessages({
        connection,
        apiKey,
        apiId: model.apiId,
        system: systemPrompt({ company, position, employee, thread }),
        messages: anthropicTurns(messages, employee.id, ownReplays),
        onText: (text) => process.stdout.write(text),
    })
    process.stdout.write("\n")
    const body = response.content
        .filter((block) => block.type === "text")
        .map(({ text }) => text)
        .join("")
    if (body.trim() === "") {
        throw new UserError(
            `${employee.name} answered nothing (stop reason: ${response.stop_reason}).`,
        )
    }
    if (response.stop_reason === "max_tokens") {
        console.error(`${employee.name}'s answer was cut at its length limit.`)
    }
    const id = await sendDraft(threadId, {
        position: { id: position.id, title: position.title },
        employee: { id: employee.id, name: employee.name },
        committer: committer(),
        body,
        ...(await readMentions(body, position.id)),
    })
    await saveResponse(
        projectRoot,
        { threadId, id },
        {
            providerId: provider.id,
            modelId: model.id,
            protocol: model.protocol,
            apiId: model.apiId,
            response,
        },
    )
}

export async function answerMentions(
    threadId: string,
    positionIds: string[],
): Promise<void> {
    const failures: string[] = []
    for (const positionId of positionIds) {
        const position = await loadPosition(projectRoot, positionId)
        if (position.defaultEmployeeId === undefined) {
            console.error(
                `@${position.id} is vacant: the message waits until someone is assigned.`,
            )
            continue
        }
        const employee = await loadEmployee(
            projectRoot,
            position.defaultEmployeeId,
        )
        if (employee.kind === "human") {
            console.error(
                `@${position.id} is worked by ${employee.name}, a human: the message waits for their answer.`,
            )
            continue
        }
        try {
            await answerAs(threadId, position, employee)
        } catch (error) {
            if (!(error instanceof UserError)) {
                throw error
            }
            failures.push(`@${position.id} didn't answer: ${error.message}`)
        }
    }
    if (failures.length > 0) {
        throw new UserError(
            `${failures.join("\n")}\nThe message was sent, and stays awaited by these positions.`,
        )
    }
}
