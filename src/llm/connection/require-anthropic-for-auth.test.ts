import { describe, expect, test } from "bun:test"
import { UserError } from "../../user-error.ts"
import { requireAnthropicForAuth } from "./require-anthropic-for-auth.ts"

describe("requireAnthropicForAuth", () => {
    test("accepts an auth for anthropic-messages, or no auth", () => {
        const requireBearerOnAnthropic = () =>
            requireAnthropicForAuth("anthropic-messages", "bearer")
        const requireNoAuthOnOpenAi = () =>
            requireAnthropicForAuth("openai-responses", undefined)

        expect(requireBearerOnAnthropic).not.toThrow()
        expect(requireNoAuthOnOpenAi).not.toThrow()
    })

    test("refuses an auth for the OpenAI protocols", () => {
        const requireBearerOnOpenAi = () =>
            requireAnthropicForAuth("openai-responses", "bearer")

        expect(requireBearerOnOpenAi).toThrow(UserError)
        expect(requireBearerOnOpenAi).toThrow("always send a bearer token")
    })
})
