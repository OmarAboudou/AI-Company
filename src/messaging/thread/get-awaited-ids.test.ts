import { describe, expect, test } from "bun:test"
import type { IdHistory } from "../../ids/id-history-schema.ts"
import type { Message } from "../../message/message.ts"
import { getAwaitedIds } from "./get-awaited-ids.ts"
import { getMemberIds } from "./get-member-ids.ts"
import type { Thread } from "./schema.ts"

const director = { id: "director", title: "Director" }

const committer = { name: "Omar Aboudou", email: "omar@example.com" }

const thread: Thread = {
    id: "2026-10-18-budget",
    subject: "Budget",
    createdAt: "2026-10-18T14:00:00.000Z",
    createdBy: { position: director, committer },
}

function createMessage(
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

function getThreadMemberIds(messages: Message[], positions: IdHistory[] = []) {
    return getMemberIds(thread, messages, positions)
}

function getThreadAwaitedIds(messages: Message[], positions: IdHistory[] = []) {
    return getAwaitedIds(thread, messages, positions)
}

describe("getAwaitedIds", () => {
    test("awaits a mentioned position until it writes", () => {
        const question = createMessage("director", ["backend-developer"])
        const answer = createMessage("backend-developer")

        expect(getThreadAwaitedIds([question])).toEqual(["backend-developer"])
        expect(getThreadAwaitedIds([question, answer])).toEqual([])
    })

    test("awaits a position again when mentioned after its answer", () => {
        const messages = [
            createMessage("director", ["backend-developer"]),
            createMessage("backend-developer"),
            createMessage("director", ["backend-developer"]),
        ]

        expect(getThreadAwaitedIds(messages)).toEqual(["backend-developer"])
    })

    test("doesn't await a position because it is a member", () => {
        const messages = [
            createMessage("director", ["backend-developer"]),
            createMessage("backend-developer", ["director"]),
            createMessage("director"),
        ]

        expect(getThreadMemberIds(messages)).toContain("backend-developer")
        expect(getThreadAwaitedIds(messages)).toEqual([])
    })

    test("awaits every position mentioned, in the order members are", () => {
        const messages = [createMessage("director", ["qa-tester", "designer"])]

        expect(getThreadAwaitedIds(messages)).toEqual(["qa-tester", "designer"])
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
        const question = createMessage("director", ["backend-developer"])

        expect(getThreadAwaitedIds([question], positions)).toEqual([
            "api-developer",
        ])
    })

    test("counts an answer under the new id for a mention made before", () => {
        const question = createMessage("director", ["backend-developer"])
        const answer = createMessage(
            "api-developer",
            [],
            "2026-10-19T10:00:00.000Z",
        )

        expect(getThreadAwaitedIds([question], positions)).toEqual([
            "api-developer",
        ])
        expect(getThreadAwaitedIds([question, answer], positions)).toEqual([])
    })

    test("keeps the id of a position nobody has had since", () => {
        const question = createMessage("director", ["designer"])

        expect(getThreadAwaitedIds([question], positions)).toEqual(["designer"])
    })
})
