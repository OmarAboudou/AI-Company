import type Anthropic from "@anthropic-ai/sdk"
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
import { sendUnsentMessage } from "../messaging/message/send-unsent-message.ts"
import {
    listMessages,
    loadProviderResponse,
    saveProviderResponse,
} from "../messaging/message/storage.ts"
import { loadThread } from "../messaging/thread/storage.ts"
import { loadCompany } from "../organization/company/storage.ts"
import type { Employee } from "../organization/employee/schema.ts"
import type { Position } from "../organization/position/schema.ts"
import { UserError } from "../user-error.ts"
import { buildSystemPrompt } from "./build-system-prompt.ts"

type LlmEmployee = Extract<Employee, { kind: "llm" }>

export type LlmAnswerEvent =
    | { kind: "answering"; position: Position; employee: LlmEmployee }
    | { kind: "text"; text: string }
    | { kind: "streamed" }
    | {
          kind: "answered"
          employee: LlmEmployee
          answer: Message
          isCut: boolean
          unknownMentionIds: string[]
      }

async function loadReplays(
    projectRoot: string,
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
            // llmco wrote it from the SDK's own response, in answerAsLlmEmployee.
            const { content } = response.payload as Anthropic.Message
            return [[message.id, content] as const]
        }),
    )
    return new Map(replayEntries.flat())
}

export async function answerAsLlmEmployee(
    projectRoot: string,
    threadId: string,
    position: Position,
    employee: LlmEmployee,
    onEvent: (event: LlmAnswerEvent) => void,
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
        loadReplays(projectRoot, messages, employee, model),
    ])
    onEvent({ kind: "answering", position, employee })
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
        onText: (text) => onEvent({ kind: "text", text }),
    })
    onEvent({ kind: "streamed" })
    const body = response.content
        .filter((block) => block.type === "text")
        .map(({ text }) => text)
        .join("")
    if (body.trim() === "") {
        throw new UserError(
            `${employee.name} answered nothing (stop reason: ${response.stop_reason}).`,
        )
    }
    const unsentAnswer = {
        position: { id: position.id, title: position.title },
        employee: { id: employee.id, name: employee.name },
        committer: readGitCommitter(projectRoot),
        body,
        ...(await resolveMentions(projectRoot, body, position.id)),
    }
    const answer = await sendUnsentMessage(projectRoot, threadId, unsentAnswer)
    await saveProviderResponse(projectRoot, answer, {
        providerId: provider.id,
        modelId: model.id,
        protocol: model.protocol,
        apiId: model.apiId,
        payload: response,
    })
    onEvent({
        kind: "answered",
        employee,
        answer,
        isCut: response.stop_reason === "max_tokens",
        unknownMentionIds: unsentAnswer.unknownMentionIds,
    })
}
