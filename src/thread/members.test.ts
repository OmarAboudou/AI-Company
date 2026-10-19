import { describe, expect, test } from "bun:test"
import type { IdHistory } from "../ids/id-history-schema.ts"
import type { Message } from "../message/message.ts"
import type { Thread } from "../messaging/thread/schema.ts"
import { awaitedIds, memberIds } from "./members.ts"

const director = { id: "director", title: "Director" }
const committer = { name: "Omar Aboudou", email: "omar@example.com" }

const thread: Thread = {
    id: "2026-10-18-budget",
    subject: "Budget",
    createdAt: "2026-10-18T14:00:00.000Z",
    createdBy: { position: director, committer },
}

function message(
    positionId: string,
    mentions: string[] = [],
    sentAt = "2026-10-18T14:00:00.000Z",
): Message {
    return {
        threadId: thread.id,
        id: "20261018-140000-000-0000",
        position: { id: positionId, title: positionId },
        committer,
        mentions,
        sentAt,
        body: "",
    }
}

function members(messages: Message[], positions: IdHistory[] = []) {
    return memberIds(thread, messages, positions)
}

function awaited(messages: Message[], positions: IdHistory[] = []) {
    return awaitedIds(thread, messages, positions)
}

describe("memberIds", () => {
    test("is the creator's position in a thread without messages", () => {
        expect(members([])).toEqual(["director"])
    })

    test("adds authors and mentioned positions, in order", () => {
        const messages = [
            message("director", ["backend-developer"]),
            message("qa-tester"),
            message("backend-developer", ["director", "designer"]),
        ]

        expect(members(messages)).toEqual([
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

        expect(awaited([question])).toEqual(["backend-developer"])
        expect(awaited([question, answer])).toEqual([])
    })

    test("awaits a position again when mentioned after its answer", () => {
        const messages = [
            message("director", ["backend-developer"]),
            message("backend-developer"),
            message("director", ["backend-developer"]),
        ]

        expect(awaited(messages)).toEqual(["backend-developer"])
    })

    test("doesn't await a position because it is a member", () => {
        const messages = [
            message("director", ["backend-developer"]),
            message("backend-developer", ["director"]),
            message("director"),
        ]

        expect(members(messages)).toContain("backend-developer")
        expect(awaited(messages)).toEqual([])
    })

    test("awaits every position mentioned, in the order members are", () => {
        const messages = [message("director", ["qa-tester", "designer"])]

        expect(awaited(messages)).toEqual(["qa-tester", "designer"])
    })
})

describe("through the positions' id history", () => {
    const renamedAt = "2026-10-19T09:00:00.000Z"
    const positions = [
        {
            id: "api-developer",
            formerIds: [{ id: "backend-developer", until: renamedAt }],
        },
        { id: "ceo", formerIds: [{ id: "director", until: renamedAt }] },
    ]

    test("awaits a renamed position under its new id", () => {
        const question = message("director", ["backend-developer"])

        expect(awaited([question], positions)).toEqual(["api-developer"])
    })

    test("counts an answer under the new id for a mention made before", () => {
        const question = message("director", ["backend-developer"])
        const answer = message("api-developer", [], "2026-10-19T10:00:00.000Z")

        expect(awaited([question], positions)).toEqual(["api-developer"])
        expect(awaited([question, answer], positions)).toEqual([])
    })

    test("keeps the id of a position nobody has had since", () => {
        const question = message("director", ["designer"])

        expect(awaited([question], positions)).toEqual(["designer"])
    })

    test("names a renamed creator by its new id", () => {
        expect(members([], positions)).toEqual(["ceo"])
    })
})
