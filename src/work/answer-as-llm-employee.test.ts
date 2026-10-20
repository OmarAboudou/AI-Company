import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { useFakeAnthropicServer } from "../llm/anthropic-messages/use-fake-anthropic-server.ts"
import { createLlmConnection } from "../llm/connection/create-llm-connection.ts"
import { updateLlmModel } from "../llm/model/update-llm-model.ts"
import { sendMessage } from "../messaging/message/send-message.ts"
import {
    listMessages,
    loadProviderResponse,
} from "../messaging/message/storage.ts"
import { loadEmployee } from "../organization/employee/storage.ts"
import { updateEmployeeId } from "../organization/employee/update-employee-id.ts"
import { loadPosition } from "../organization/position/storage.ts"
import { UserError } from "../user-error.ts"
import {
    answerAsLlmEmployee,
    type LlmAnswerEvent,
} from "./answer-as-llm-employee.ts"
import { createAnsweringCompany } from "./create-answering-company.ts"

const fakeServer = useFakeAnthropicServer()
const variableNames = ["LLMCO_CURRENT_HUMAN_ID", "TEST_ANTHROPIC_KEY"] as const
const shellValues = variableNames.map((name) => process.env[name])
const question = "@backend-developer Hono or Express?"
let projectRoot: string
let threadId: string

beforeEach(async () => {
    delete process.env.LLMCO_CURRENT_HUMAN_ID
    process.env.TEST_ANTHROPIC_KEY = "sk-test"
    const answeringCompany = await createAnsweringCompany(fakeServer.getUrl())
    projectRoot = answeringCompany.projectRoot
    threadId = answeringCompany.threadId
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

async function sendAndAnswer(
    body: string,
    employeeId = "claude",
): Promise<LlmAnswerEvent[]> {
    await sendMessage(projectRoot, threadId, { body })
    const [position, employee] = await Promise.all([
        loadPosition(projectRoot, "backend-developer"),
        loadEmployee(projectRoot, employeeId),
    ])
    if (employee.kind !== "llm") {
        throw new Error(`Employee "${employeeId}" isn't an LLM`)
    }
    const answerEvents: LlmAnswerEvent[] = []
    await answerAsLlmEmployee(
        projectRoot,
        threadId,
        position,
        employee,
        (event) => answerEvents.push(event),
    )
    return answerEvents
}

function getEventKinds(answerEvents: LlmAnswerEvent[]): string[] {
    return answerEvents.map(({ kind }) => kind)
}

function formatSecondRequestTurns(): string[] {
    const turns = fakeServer.requests[1]?.body.messages ?? []
    return turns.map(({ role, content }) => {
        const contentTypes = content.map(({ type }) => type)
        return `${role}: ${contentTypes.join(", ")}`
    })
}

describe("answerAsLlmEmployee", () => {
    test("streams the LLM employee's answer", async () => {
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

    test("gives the employee its own answer back", async () => {
        fakeServer.respondWith({ text: "Hono.", signature: "sig-1" })
        await sendAndAnswer(question)

        await sendAndAnswer("@backend-developer Why?")

        expect(formatSecondRequestTurns()).toEqual([
            "user: text",
            "assistant: thinking, text",
            "user: text",
        ])
    })

    test("gives the employee its own answer back once renamed", async () => {
        fakeServer.respondWith({ text: "Hono.", signature: "sig-1" })
        await sendAndAnswer(question)
        await updateEmployeeId(projectRoot, "claude", "cto")

        await sendAndAnswer("@backend-developer Why?", "cto")

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

describe("answerAsLlmEmployee when it can't answer", () => {
    test("refuses without the provider's key", async () => {
        delete process.env.TEST_ANTHROPIC_KEY

        const answering = sendAndAnswer(question)

        await expect(answering).rejects.toThrow(UserError)
        await expect(answering).rejects.toThrow("which isn't set")
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
})
