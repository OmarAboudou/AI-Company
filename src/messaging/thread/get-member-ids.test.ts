import { describe, expect, test } from "bun:test"
import type { IdHistory } from "../../ids/id-history-schema.ts"
import type { Message } from "../message/schema.ts"
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

function createMessage(positionId: string): Message {
    return {
        threadId: thread.id,
        id: "20261018-140000-000-0000",
        position: { id: positionId, title: positionId },
        committer,
        sentAt: "2026-10-18T14:00:00.000Z",
        body: "",
    }
}

function getThreadMemberIds(messages: Message[], positions: IdHistory[] = []) {
    return getMemberIds(thread, messages, positions)
}

describe("getMemberIds", () => {
    test("is the creator's position in a thread without messages", () => {
        expect(getThreadMemberIds([])).toEqual(["director"])
    })

    test("adds the positions that wrote in it, in order", () => {
        const messages = [
            createMessage("director"),
            createMessage("qa-tester"),
            createMessage("backend-developer"),
            createMessage("qa-tester"),
        ]

        expect(getThreadMemberIds(messages)).toEqual([
            "director",
            "qa-tester",
            "backend-developer",
        ])
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

    test("names a renamed creator by its new id", () => {
        expect(getThreadMemberIds([], positions)).toEqual(["ceo"])
    })
})
