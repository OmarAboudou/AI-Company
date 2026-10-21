import { defineListener } from "./define-listener.ts"

export const mentionListener = defineListener({
    on: {
        "message-sent": ({ threadId, mentions }) =>
            mentions.map((positionId) => ({
                type: "catch-up-thread",
                positionId,
                params: { threadId },
            })),
    },
})
