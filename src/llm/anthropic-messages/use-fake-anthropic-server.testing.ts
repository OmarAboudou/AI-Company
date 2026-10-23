import { afterEach, beforeEach } from "bun:test"
import type Anthropic from "@anthropic-ai/sdk"
import type { Server } from "bun"

export type FakeToolCall = { name: string; input: object }

export type FakeReply =
    | {
          text?: string
          signature?: string
          toolCalls?: FakeToolCall[]
          stopReason?: Anthropic.StopReason
      }
    | { status: number; error: string }
    | { isHanging: true }

export type ReceivedBlock = {
    type: string
    text?: string
    id?: string
    name?: string
    input?: unknown
    tool_use_id?: string
    content?: unknown
    is_error?: boolean
    cache_control?: { type: string }
}

export type ReceivedRequest = {
    path: string
    headers: Record<string, string>
    body: {
        model: string
        max_tokens: number
        stream: boolean
        system: ReceivedBlock[]
        tools?: Anthropic.Tool[]
        messages: { role: string; content: ReceivedBlock[] }[]
    }
}

function formatEvent(type: string, fields: object): string {
    return `event: ${type}\ndata: ${JSON.stringify({ type, ...fields })}\n\n`
}

function formatBlockEvents(
    index: number,
    contentBlock: object,
    deltas: object[],
): string[] {
    return [
        formatEvent("content_block_start", {
            index,
            content_block: contentBlock,
        }),
        ...deltas.map((delta) =>
            formatEvent("content_block_delta", { index, delta }),
        ),
        formatEvent("content_block_stop", { index }),
    ]
}

function formatEventStream({
    text,
    signature,
    toolCalls = [],
    stopReason,
}: Exclude<FakeReply, { error: string } | { isHanging: true }>): string {
    const blocks: [object, object[]][] = []
    if (signature !== undefined) {
        blocks.push([
            { type: "thinking", thinking: "", signature: "" },
            [{ type: "signature_delta", signature }],
        ])
    }
    if (text !== undefined) {
        blocks.push([
            { type: "text", text: "" },
            text
                .split(/(?<= )/)
                .map((piece) => ({ type: "text_delta", text: piece })),
        ])
    }
    for (const [index, { name, input }] of toolCalls.entries()) {
        blocks.push([
            { type: "tool_use", id: `toolu_fake_${index}`, name, input: {} },
            [{ type: "input_json_delta", partial_json: JSON.stringify(input) }],
        ])
    }
    return [
        formatEvent("message_start", {
            message: {
                id: "msg_fake",
                type: "message",
                role: "assistant",
                model: "fake",
                content: [],
                stop_reason: null,
                stop_sequence: null,
                usage: {
                    input_tokens: 10,
                    output_tokens: 1,
                    cache_creation_input_tokens: 20,
                    cache_read_input_tokens: 100,
                },
            },
        }),
        ...blocks.flatMap(([contentBlock, deltas], index) =>
            formatBlockEvents(index, contentBlock, deltas),
        ),
        formatEvent("message_delta", {
            delta: {
                stop_reason:
                    stopReason ??
                    (toolCalls.length > 0 ? "tool_use" : "end_turn"),
                stop_sequence: null,
            },
            usage: { output_tokens: 5 },
        }),
        formatEvent("message_stop", {}),
    ].join("")
}

export function useFakeAnthropicServer() {
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
                if ("isHanging" in reply) {
                    return new Promise<Response>(() => {})
                }
                if ("error" in reply) {
                    const error = { type: "api_error", message: reply.error }
                    return Response.json(
                        { type: "error", error },
                        { status: reply.status },
                    )
                }
                return new Response(formatEventStream(reply), {
                    headers: { "content-type": "text/event-stream" },
                })
            },
        })
    })

    afterEach(async () => {
        await server?.stop(true)
    })

    return {
        getUrl: () => `http://localhost:${server?.port}`,
        requests,
        respondWith: (...nextReplies: FakeReply[]) => {
            replies.push(...nextReplies)
        },
    }
}
