import { describe, expect, test } from "bun:test"
import { UserError } from "../../user-error.ts"
import { requireAnthropicForAuth } from "./require-anthropic-for-auth.ts"

describe("requireAnthropicForAuth", () => {
    test("accepts an auth for anthropic-messages, or no auth", () => {
        const anthropic = () =>
            requireAnthropicForAuth("anthropic-messages", "bearer")
        const openAi = () =>
            requireAnthropicForAuth("openai-responses", undefined)

        expect(anthropic).not.toThrow()
        expect(openAi).not.toThrow()
    })

    test("refuses an auth for the OpenAI protocols", () => {
        const openAi = () =>
            requireAnthropicForAuth("openai-responses", "bearer")

        expect(openAi).toThrow(UserError)
        expect(openAi).toThrow("always send a bearer token")
    })
})
