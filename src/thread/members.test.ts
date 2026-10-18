import { describe, expect, test } from "bun:test"
import type { Message } from "../message/message.ts"
import { awaitedIds, memberIds } from "./members.ts"
import type { Thread } from "./thread.ts"

const director = { id: "director", title: "Director" }
const committer = { name: "Omar Aboudou", email: "omar@example.com" }

const thread: Thread = {
    id: "2026-10-18-budget",
    subject: "Budget",
    createdAt: "2026-10-18T14:00:00.000Z",
    createdBy: { position: director, committer },
}

function message(positionId: string, mentions: string[] = []): Message {
    return {
        threadId: thread.id,
        id: "20261018-140000-000-0000",
        position: { id: positionId, title: positionId },
        committer,
        mentions,
        sentAt: "2026-10-18T14:00:00.000Z",
        body: "",
    }
}

describe("memberIds", () => {
    test("is the creator's position in a thread without messages", () => {
        expect(memberIds(thread, [])).toEqual(["director"])
    })

    test("adds authors and mentioned positions, in order", () => {
        const messages = [
            message("director", ["backend-developer"]),
            message("qa-tester"),
            message("backend-developer", ["director", "designer"]),
        ]

        expect(memberIds(thread, messages)).toEqual([
            "director",
            "backend-developer",
            "qa-tester",
            "designer",
        ])
    })
})

describe("awaitedIds", () => {
    test("awaits a mentioned position until it writes", () => {
        const question = message("director", ["backend-developer"])
        const answer = message("backend-developer")

        expect(awaitedIds(thread, [question])).toEqual(["backend-developer"])
        expect(awaitedIds(thread, [question, answer])).toEqual([])
    })

    test("awaits a position again when mentioned after its answer", () => {
        const messages = [
            message("director", ["backend-developer"]),
            message("backend-developer"),
            message("director", ["backend-developer"]),
        ]

        expect(awaitedIds(thread, messages)).toEqual(["backend-developer"])
    })

    test("doesn't await a position because it is a member", () => {
        const messages = [
            message("director", ["backend-developer"]),
            message("backend-developer", ["director"]),
            message("director"),
        ]

        expect(memberIds(thread, messages)).toContain("backend-developer")
        expect(awaitedIds(thread, messages)).toEqual([])
    })

    test("awaits every position mentioned, in the order members are", () => {
        const messages = [message("director", ["qa-tester", "designer"])]

        expect(awaitedIds(thread, messages)).toEqual(["qa-tester", "designer"])
    })
})
