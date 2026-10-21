import { describe, expect, test } from "bun:test"
import type { Message } from "../../../../messaging/message/schema.ts"
import type { Thread } from "../../../../messaging/thread/schema.ts"
import { buildCatchUpMessage, type CatchUp } from "./build-catch-up-message.ts"

const director = { id: "director", title: "Director" }
const developer = { id: "backend-developer", title: "Backend Developer" }
const omar = { name: "Omar Aboudou", email: "omar@example.com" }

const thread: Thread = {
    id: "2026-10-18-choice-of-framework",
    subject: "Choice of framework",
    createdAt: "2026-10-18T14:03:22.123Z",
    createdBy: { position: director, committer: omar },
}

function createMessage(
    id: string,
    position: Message["position"],
    body: string,
): Message {
    return {
        threadId: thread.id,
        id,
        position,
        committer: omar,
        mentions: [],
        sentAt: "2026-10-18T14:03:22.123Z",
        body,
    }
}

const catchUp: CatchUp = {
    thread,
    memberIds: ["director", "backend-developer"],
    messages: [
        createMessage("1", director, "@backend-developer Hono or Express?"),
        createMessage("2", developer, "Hono, for Bun."),
        createMessage("3", director, "@backend-developer And the database?"),
    ],
    readCount: 2,
}

describe("buildCatchUpMessage", () => {
    test("gives the thread, then the entries unread, numbered", () => {
        const userMessage = buildCatchUpMessage(catchUp)

        expect(userMessage).toBe(
            [
                '# Thread "Choice of framework" (2026-10-18-choice-of-framework)',
                "",
                "Created by Omar Aboudou, Director (@director), on 2026-10-18 14:03 UTC. Its members: @director, @backend-developer.",
                "",
                "You have read it up to entry #2: thread_show shows earlier entries again if you need them.",
                "Entry #3, which you haven't read:",
                "",
                '<message number="3" from="Omar Aboudou" position="Director (@director)" sent="2026-10-18 14:03 UTC">',
                "@backend-developer And the database?",
                "</message>",
                "",
                "# Your task",
                "",
                "Catch up on this thread: if its entries ask something of your position, answer in the thread with message_send. Then call task_complete with a summary of what you did.",
            ].join("\n"),
        )
    })

    test("gives every entry of a thread not read yet", () => {
        const userMessage = buildCatchUpMessage({ ...catchUp, readCount: 0 })

        expect(userMessage).not.toContain("You have read it")
        expect(userMessage).toContain("Entries #1 to #3, which you haven't")
        expect(userMessage).toContain('<message number="1"')
        expect(userMessage).toContain('<message number="2"')
    })
})
