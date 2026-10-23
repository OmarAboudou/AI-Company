import { z } from "zod"
import { defineTaskType } from "../../define-task-type.ts"

export const whatNowTaskType = defineTaskType({
    type: "what-now",
    paramsSchema: z.strictObject({}),
    resultSchema: z.strictObject({}),
    async createSession() {
        return {
            userMessage:
                "What now? Choose what the company does next: ask a position for work with ticket_create, one ticket per request; `aico ticket list` shows where the tickets stand. End your session once you are done: What now? comes back at the end of your queue, after the tasks your tickets bring you.",
            toolNames: ["ticket_create"],
            result: {},
        }
    },
})
