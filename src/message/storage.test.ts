import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { IdSchema } from "../ids/id-schema.ts"
import type { Message } from "./message.ts"
import {
    listMessages,
    loadResponse,
    newMessageId,
    nextSentAt,
    saveMessage,
    saveResponse,
} from "./storage.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), "llmco-"))
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

const question: Message = {
    threadId: "2026-10-18-choice-of-framework",
    id: "20261018-140322-123-3f9a",
    position: { id: "director", title: "Director" },
    committer: { name: "Omar Aboudou", email: "omar@example.com" },
    mentions: ["backend-developer"],
    sentAt: "2026-10-18T14:03:22.123Z",
    body: "@backend-developer Hono or Express?",
}

const answer: Message = {
    ...question,
    id: "20261018-140351-000-b27c",
    position: { id: "backend-developer", title: "Backend Developer" },
    employee: { id: "claude-senior", name: "Claude Senior" },
    mentions: [],
    sentAt: "2026-10-18T14:03:51.000Z",
    body: "Hono: it runs on Bun.",
}

describe("saveMessage and listMessages", () => {
    test("write message.json and body.md, then read them back", async () => {
        await saveMessage(projectRoot, question)

        const dir = join(
            projectRoot,
            ".llmco",
            "threads",
            question.threadId,
            "messages",
            question.id,
        )
        const body = await Bun.file(join(dir, "body.md")).text()
        const messages = await listMessages(projectRoot, question.threadId)

        expect(body).toBe(question.body)
        expect(messages).toEqual([question])
    })

    test("list returns the messages oldest first", async () => {
        await saveMessage(projectRoot, answer)
        await saveMessage(projectRoot, question)

        const messages = await listMessages(projectRoot, question.threadId)

        expect(messages).toEqual([question, answer])
    })
})

describe("saveResponse and loadResponse", () => {
    const response = {
        providerId: "anthropic",
        modelId: "claude-opus-5-5",
        protocol: "anthropic-messages",
        apiId: "claude-opus-5-5",
        response: { content: [{ type: "text", text: "Hono." }] },
    } as const

    test("write response.json next to the message, then read it", async () => {
        await saveMessage(projectRoot, answer)

        await saveResponse(projectRoot, answer, response)

        expect(await loadResponse(projectRoot, answer)).toEqual(response)
    })

    test("load gives nothing for a message without response", async () => {
        await saveMessage(projectRoot, question)

        expect(await loadResponse(projectRoot, question)).toBeUndefined()
    })
})

describe("newMessageId", () => {
    test("is the time of sending with a random suffix", () => {
        const id = newMessageId("2026-10-18T14:03:22.123Z")

        expect(id).toMatch(/^20261018-140322-123-[0-9a-f]{4}$/)
        expect(IdSchema.safeParse(id).success).toBe(true)
    })

    test("differs between two messages sent at the same time", () => {
        const ids = new Set(
            Array.from({ length: 20 }, () => newMessageId(question.sentAt)),
        )

        expect(ids.size).toBeGreaterThan(1)
    })
})

describe("nextSentAt", () => {
    test("is now in a thread without messages", () => {
        const now = new Date("2026-10-18T14:03:22.123Z")

        expect(nextSentAt([], now)).toBe("2026-10-18T14:03:22.123Z")
    })

    test("comes after the last message, even within its millisecond", () => {
        const now = new Date(question.sentAt)

        expect(nextSentAt([question], now)).toBe("2026-10-18T14:03:22.124Z")
    })
})
