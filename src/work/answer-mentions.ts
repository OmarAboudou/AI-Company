import type Anthropic from "@anthropic-ai/sdk"
import { projectRoot } from "../cli/project-root.ts"
import { readGitCommitter } from "../git/read-git-committer.ts"
import { isAuthorOf } from "../ids/is-author-of.ts"
import { callAnthropicMessages } from "../llm/anthropic-messages/call-anthropic-messages.ts"
import {
    getAnthropicTurns,
    type Replays,
} from "../llm/anthropic-messages/get-anthropic-turns.ts"
import type { LlmModel } from "../llm/model/schema.ts"
import { loadLlmModel } from "../llm/model/storage.ts"
import { readApiKey } from "../llm/provider/read-api-key.ts"
import { loadLlmProvider } from "../llm/provider/storage.ts"
import { resolveMentions } from "../messaging/message/resolve-mentions.ts"
import type { Message } from "../messaging/message/schema.ts"
import { sendDraft } from "../messaging/message/send-draft.ts"
import {
    listMessages,
    loadProviderResponse,
    saveProviderResponse,
} from "../messaging/message/storage.ts"
import { loadThread } from "../messaging/thread/storage.ts"
import { loadCompany } from "../organization/company/storage.ts"
import type { Employee } from "../organization/employee/schema.ts"
import { loadEmployee } from "../organization/employee/storage.ts"
import { getCurrentWorker } from "../organization/position/get-current-worker.ts"
import type { Position } from "../organization/position/schema.ts"
import {
    loadPosition,
    loadPositionState,
} from "../organization/position/storage.ts"
import { UserError } from "../user-error.ts"
import { buildSystemPrompt } from "./build-system-prompt.ts"

type LlmEmployee = Extract<Employee, { kind: "llm" }>

async function loadReplays(
    messages: Message[],
    employee: LlmEmployee,
    model: LlmModel,
): Promise<Replays> {
    const ownMessages = messages.filter((message) =>
        isAuthorOf(employee, message),
    )
    const replayEntries = await Promise.all(
        ownMessages.map(async (message) => {
            const response = await loadProviderResponse(projectRoot, message)
            const isSameModel =
                response?.protocol === "anthropic-messages" &&
                response.providerId === model.providerId &&
                response.apiId === model.apiId
            if (!isSameModel) {
                return []
            }
            // llmco wrote it from the SDK's own response, in answerAs.
            const { content } = response.response as Anthropic.Message
            return [[message.id, content] as const]
        }),
    )
    return new Map(replayEntries.flat())
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
        readApiKey(projectRoot, provider),
        loadReplays(messages, employee, model),
    ])
    console.error(
        `${employee.name} answers as ${position.title} (@${position.id}):`,
    )
    const response = await callAnthropicMessages({
        connection,
        apiKey,
        apiId: model.apiId,
        systemPrompt: buildSystemPrompt({
            company,
            position,
            employee,
            thread,
        }),
        turns: getAnthropicTurns(messages, employee, ownReplays),
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
        committer: readGitCommitter(projectRoot),
        body,
        ...(await resolveMentions(body, position.id)),
    })
    await saveProviderResponse(
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
    const failureMessages: string[] = []
    const { directorPositionId } = await loadCompany(projectRoot)
    for (const positionId of positionIds) {
        const [position, positionState] = await Promise.all([
            loadPosition(projectRoot, positionId),
            loadPositionState(projectRoot, positionId),
        ])
        const worker = getCurrentWorker(
            position,
            positionState,
            directorPositionId,
        )
        if (worker === undefined) {
            console.error(
                `@${position.id} is vacant: the message waits until someone is assigned.`,
            )
            continue
        }
        if (worker.kind === "directors") {
            console.error(
                `@${position.id} is worked by the directors: the message waits for their answer.`,
            )
            continue
        }
        const employee = await loadEmployee(projectRoot, worker.employeeId)
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
            failureMessages.push(
                `@${position.id} didn't answer: ${error.message}`,
            )
        }
    }
    if (failureMessages.length > 0) {
        throw new UserError(
            `${failureMessages.join("\n")}\nThe message was sent, and stays awaited by these positions.`,
        )
    }
}
