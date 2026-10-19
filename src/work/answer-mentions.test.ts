import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { createGitRepository } from "../git/create-git-repository.ts"
import { useFakeAnthropicServer } from "../llm/anthropic-messages/use-fake-anthropic-server.ts"
import { createLlmConnection } from "../llm/connection/create-llm-connection.ts"
import { createLlmModel } from "../llm/model/create-llm-model.ts"
import { updateLlmModel } from "../llm/model/update-llm-model.ts"
import { createLlmProvider } from "../llm/provider/create-llm-provider.ts"
import { sendMessage } from "../messaging/message/send-message.ts"
import {
    listMessages,
    loadProviderResponse,
} from "../messaging/message/storage.ts"
import { createThread } from "../messaging/thread/create-thread.ts"
import { createTemporaryCompany } from "../organization/company/create-temporary-company.ts"
import { createEmployee } from "../organization/employee/create-employee.ts"
import { updateEmployeeId } from "../organization/employee/update-employee-id.ts"
import { assignPosition } from "../organization/position/assign-position.ts"
import { assignPositionTemporarily } from "../organization/position/assign-position-temporarily.ts"
import { createPosition } from "../organization/position/create-position.ts"
import { unassignPositionTemporarily } from "../organization/position/unassign-position-temporarily.ts"
import { UserError } from "../user-error.ts"
import { type AnswerEvent, answerMentions } from "./answer-mentions.ts"

const fakeServer = useFakeAnthropicServer()
const variableNames = ["LLMCO_CURRENT_HUMAN_ID", "TEST_ANTHROPIC_KEY"] as const
const shellValues = variableNames.map((name) => process.env[name])
const committer = { name: "Test User", email: "test@example.com" }
const question = "@backend-developer Hono or Express?"
let projectRoot: string
let threadId: string

async function createLlmEmployee(): Promise<void> {
    const apiKey = { kind: "env", variable: "TEST_ANTHROPIC_KEY" } as const
    await createLlmProvider(projectRoot, "anthropic", { name: "A", apiKey })
    await createLlmConnection(projectRoot, "anthropic", "anthropic-messages", {
        baseUrl: fakeServer.getUrl(),
    })
    const opus = { name: "Opus", apiId: "claude-opus-5-5" }
    await createLlmModel(projectRoot, "anthropic", "opus", opus)
    await createEmployee(projectRoot, "claude", {
        name: "Claude Senior",
        kind: "llm",
        providerId: "anthropic",
        modelId: "opus",
    })
}

beforeEach(async () => {
    delete process.env.LLMCO_CURRENT_HUMAN_ID
    process.env.TEST_ANTHROPIC_KEY = "sk-test"
    projectRoot = await createTemporaryCompany()
    createGitRepository(projectRoot, committer)
    await Promise.all([
        createLlmEmployee(),
        createEmployee(projectRoot, "julie", { name: "Julie", kind: "human" }),
        ...["backend-developer", "qa-tester"].map((id) =>
            createPosition(projectRoot, id, { title: id, description: "" }),
        ),
    ])
    await assignPosition(projectRoot, "backend-developer", "claude")
    const { thread } = await createThread(projectRoot, { subject: "Stack" })
    threadId = thread.id
})

afterEach(async () => {
    for (const [index, name] of variableNames.entries()) {
        const shellValue = shellValues[index]
        if (shellValue === undefined) {
            delete process.env[name]
        } else {
            process.env[name] = shellValue
        }
    }
    await rm(projectRoot, { recursive: true, force: true })
})

async function sendAndAnswer(body: string): Promise<AnswerEvent[]> {
    const { message } = await sendMessage(projectRoot, threadId, { body })
    const answerEvents: AnswerEvent[] = []
    await answerMentions(projectRoot, threadId, message.mentions, (event) =>
        answerEvents.push(event),
    )
    return answerEvents
}

function getEventKinds(answerEvents: AnswerEvent[]): string[] {
    return answerEvents.map(({ kind }) => kind)
}

function formatSecondRequestTurns(): string[] {
    const turns = fakeServer.requests[1]?.body.messages ?? []
    return turns.map(({ role, content }) => {
        const contentTypes = content.map(({ type }) => type)
        return `${role}: ${contentTypes.join(", ")}`
    })
}

describe("answerMentions", () => {
    test("streams the answer of the LLM employee working the position", async () => {
        fakeServer.respondWith({ text: "Hono, for Bun." })

        const answerEvents = await sendAndAnswer(question)

        const streamedTexts = answerEvents.flatMap((event) =>
            event.kind === "text" ? [event.text] : [],
        )
        expect(answerEvents[0]).toMatchObject({
            kind: "answering",
            position: { id: "backend-developer" },
            employee: { id: "claude" },
        })
        const lastEventKinds = getEventKinds(answerEvents).slice(-2)
        expect(streamedTexts).toEqual(["Hono, ", "for ", "Bun."])
        expect(lastEventKinds).toEqual(["streamed", "answered"])
    })

    test("saves the answer in the thread, as the employee's", async () => {
        fakeServer.respondWith({ text: "Hono, for Bun." })

        await sendAndAnswer(question)

        const [, answer] = await listMessages(projectRoot, threadId)
        expect(answer).toMatchObject({
            position: { id: "backend-developer" },
            employee: { id: "claude", name: "Claude Senior" },
            body: "Hono, for Bun.",
        })
    })

    test("sends the model, the system prompt and the thread", async () => {
        await sendAndAnswer(question)

        const body = fakeServer.requests[0]?.body
        const lastTurn = body?.messages.at(-1)?.content.at(-1)?.text
        expect(body).toMatchObject({ model: "claude-opus-5-5", stream: true })
        expect(body?.system).toStartWith("You are Claude Senior,")
        expect(lastTurn).toEndWith(`">\n${question}\n</message>`)
    })

    test("stores the provider's raw response next to the answer only", async () => {
        fakeServer.respondWith({ text: "Hono.", signature: "sig-1" })

        await sendAndAnswer(question)

        const messages = await listMessages(projectRoot, threadId)
        const [questionResponse, answerResponse] = await Promise.all(
            messages.map((message) =>
                loadProviderResponse(projectRoot, message),
            ),
        )
        const thinking = { type: "thinking", thinking: "", signature: "sig-1" }
        expect(questionResponse).toBeUndefined()
        expect(answerResponse).toMatchObject({
            protocol: "anthropic-messages",
            apiId: "claude-opus-5-5",
            payload: { content: [thinking, { type: "text", text: "Hono." }] },
        })
    })

    test.each([
        ["under its id", () => Promise.resolve()],
        ["once renamed", () => updateEmployeeId(projectRoot, "claude", "cto")],
    ])("gives the employee its own answer back, %s", async (_, rename) => {
        fakeServer.respondWith({ text: "Hono.", signature: "sig-1" })
        await sendAndAnswer(question)
        await rename()

        await sendAndAnswer("@backend-developer Why?")

        expect(formatSecondRequestTurns()).toEqual([
            "user: text",
            "assistant: thinking, text",
            "user: text",
        ])
    })

    test("reports the answer's mentions of no position", async () => {
        fakeServer.respondWith({ text: "Hono. @director @cto, agreed?" })

        const answerEvents = await sendAndAnswer(question)

        expect(answerEvents.at(-1)).toMatchObject({
            kind: "answered",
            answer: { mentions: ["director"] },
            isCut: false,
            unknownMentionIds: ["cto"],
        })
    })
})

describe("answerMentions when nobody answers", () => {
    test("leaves the message waiting for a vacant position", async () => {
        const answerEvents = await sendAndAnswer("@qa-tester a test plan?")

        expect(getEventKinds(answerEvents)).toEqual(["vacant"])
        expect(fakeServer.requests).toHaveLength(0)
    })

    test("leaves the message waiting for a human", async () => {
        await assignPosition(projectRoot, "backend-developer", "julie", {
            shouldReplace: true,
        })

        const answerEvents = await sendAndAnswer(question)

        expect(answerEvents).toMatchObject([
            { kind: "worked-by-human", employee: { id: "julie" } },
        ])
        expect(fakeServer.requests).toHaveLength(0)
    })

    test("leaves the message waiting for the directors", async () => {
        await assignPositionTemporarily(projectRoot, "backend-developer", {
            kind: "directors",
        })

        const answerEvents = await sendAndAnswer(question)

        expect(getEventKinds(answerEvents)).toEqual(["worked-by-directors"])
        expect(fakeServer.requests).toHaveLength(0)
    })
})

describe("answerMentions by whoever works the position now", () => {
    test("lets an LLM employee assigned temporarily answer", async () => {
        await assignPosition(projectRoot, "backend-developer", "julie", {
            shouldReplace: true,
        })
        await assignPositionTemporarily(projectRoot, "backend-developer", {
            kind: "employee",
            rawEmployeeId: "claude",
        })

        const answerEvents = await sendAndAnswer(question)

        expect(answerEvents[0]).toMatchObject({ employee: { id: "claude" } })
    })

    test("lets the default employee answer once the assignment ends", async () => {
        await assignPositionTemporarily(projectRoot, "backend-developer", {
            kind: "directors",
        })
        await unassignPositionTemporarily(projectRoot, "backend-developer")

        const answerEvents = await sendAndAnswer(question)

        expect(answerEvents[0]).toMatchObject({ employee: { id: "claude" } })
    })
})

describe("answerMentions when an answer fails", () => {
    test("refuses without the provider's key, the mention staying awaited", async () => {
        delete process.env.TEST_ANTHROPIC_KEY

        const answering = sendAndAnswer(question)

        await expect(answering).rejects.toThrow(UserError)
        await expect(answering).rejects.toThrow("which isn't set")
        await expect(answering).rejects.toThrow("stays awaited")
        expect(fakeServer.requests).toHaveLength(0)
    })

    test("refuses an empty answer", async () => {
        fakeServer.respondWith({ text: "" })

        const answering = sendAndAnswer(question)

        await expect(answering).rejects.toThrow(
            "Claude Senior answered nothing",
        )
    })

    test("refuses a model called through another protocol", async () => {
        const protocol = "openai-chat-completions"
        const baseUrl = `${fakeServer.getUrl()}/v1`
        await createLlmConnection(projectRoot, "anthropic", protocol, {
            baseUrl,
        })
        await updateLlmModel(projectRoot, "anthropic", "opus", { protocol })

        const answering = sendAndAnswer(question)

        await expect(answering).rejects.toThrow("which llmco can't call yet")
        expect(fakeServer.requests).toHaveLength(0)
    })

    test("lets the other positions answer, reporting the API's error", async () => {
        await assignPosition(projectRoot, "qa-tester", "claude")
        fakeServer.respondWith({ status: 400, error: "prompt is too long" })
        const body = "@backend-developer @qa-tester Hono or Express?"

        const answering = sendAndAnswer(body)

        await expect(answering).rejects.toThrow("prompt is too long")
        await expect(answering).rejects.toThrow("@backend-developer didn't")
        const messages = await listMessages(projectRoot, threadId)
        expect(messages.at(-1)?.position.id).toBe("qa-tester")
    })
})
