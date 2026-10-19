import { afterEach, beforeEach } from "bun:test"
import type { Server } from "bun"

export type FakeReply =
    | { text: string; signature?: string }
    | { status: number; error: string }

export type ReceivedRequest = {
    path: string
    headers: Record<string, string>
    body: {
        model: string
        max_tokens: number
        stream: boolean
        system: string
        messages: { role: string; content: { type: string; text?: string }[] }[]
    }
}

function event(type: string, data: object): string {
    return `event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`
}

function stream(text: string, signature: string | undefined): string {
    const blocks: string[] = []
    let index = 0
    if (signature !== undefined) {
        blocks.push(
            event("content_block_start", {
                index,
                content_block: {
                    type: "thinking",
                    thinking: "",
                    signature: "",
                },
            }),
            event("content_block_delta", {
                index,
                delta: { type: "signature_delta", signature },
            }),
            event("content_block_stop", { index }),
        )
        index++
    }
    blocks.push(
        event("content_block_start", {
            index,
            content_block: { type: "text", text: "" },
        }),
        ...text.split(/(?<= )/).map((piece) =>
            event("content_block_delta", {
                index,
                delta: { type: "text_delta", text: piece },
            }),
        ),
        event("content_block_stop", { index }),
    )
    return [
        event("message_start", {
            message: {
                id: "msg_fake",
                type: "message",
                role: "assistant",
                model: "fake",
                content: [],
                stop_reason: null,
                stop_sequence: null,
                usage: { input_tokens: 10, output_tokens: 1 },
            },
        }),
        ...blocks,
        event("message_delta", {
            delta: { stop_reason: "end_turn", stop_sequence: null },
            usage: { output_tokens: 5 },
        }),
        event("message_stop", {}),
    ].join("")
}

export function useFakeAnthropic() {
    let server: Server<undefined> | undefined
    const requests: ReceivedRequest[] = []
    const replies: FakeReply[] = []

    beforeEach(() => {
        requests.length = 0
        replies.length = 0
        server = Bun.serve({
            port: 0,
            async fetch(request) {
                requests.push({
                    path: new URL(request.url).pathname,
                    headers: Object.fromEntries(request.headers),
                    body: (await request.json()) as ReceivedRequest["body"],
                })
                const reply = replies.shift() ?? { text: "Done." }
                if ("error" in reply) {
                    const error = { type: "api_error", message: reply.error }
                    return Response.json(
                        { type: "error", error },
                        { status: reply.status },
                    )
                }
                return new Response(stream(reply.text, reply.signature), {
                    headers: { "content-type": "text/event-stream" },
                })
            },
        })
    })

    afterEach(async () => {
        await server?.stop(true)
    })

    return {
        url: () => `http://localhost:${server?.port}`,
        requests,
        respondWith: (...next: FakeReply[]) => {
            replies.push(...next)
        },
    }
}
