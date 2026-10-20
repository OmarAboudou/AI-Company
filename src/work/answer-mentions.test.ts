import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { useFakeAnthropicServer } from "../llm/anthropic-messages/use-fake-anthropic-server.ts"
import { sendMessage } from "../messaging/message/send-message.ts"
import { listMessages } from "../messaging/message/storage.ts"
import { assignPosition } from "../organization/position/assign-position.ts"
import { assignPositionTemporarily } from "../organization/position/assign-position-temporarily.ts"
import { unassignPositionTemporarily } from "../organization/position/unassign-position-temporarily.ts"
import { UserError } from "../user-error.ts"
import { type AnswerEvent, answerMentions } from "./answer-mentions.ts"
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
    test("keeps the mention awaited when its answer is refused", async () => {
        delete process.env.TEST_ANTHROPIC_KEY

        const answering = sendAndAnswer(question)

        await expect(answering).rejects.toThrow(UserError)
        await expect(answering).rejects.toThrow("@backend-developer didn't")
        await expect(answering).rejects.toThrow("stays awaited")
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
