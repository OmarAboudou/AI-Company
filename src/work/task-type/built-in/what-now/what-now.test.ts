import { describe, expect, test } from "bun:test"
import type { TaskTypeContext } from "../../define-task-type.ts"
import { whatNowTaskType } from "./what-now.ts"

describe("What now?", () => {
    test("asks what the company does next, with ticket_create", async () => {
        const session = await whatNowTaskType.createSession(
            {},
            {} as TaskTypeContext,
        )

        expect(session.userMessage).toStartWith(
            "What now? Choose what the company does next",
        )
        expect(session.toolNames).toEqual(["ticket_create"])
    })
})
