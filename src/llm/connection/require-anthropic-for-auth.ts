import { UserError } from "../../user-error.ts"
import type { Protocol } from "./schema.ts"

export function requireAnthropicForAuth(
    protocol: Protocol,
    auth: string | undefined,
): void {
    if (auth !== undefined && protocol !== "anthropic-messages") {
        throw new UserError(
            "--auth only applies to anthropic-messages: the OpenAI protocols always send a bearer token.",
        )
    }
}
