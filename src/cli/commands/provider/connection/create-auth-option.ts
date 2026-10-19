import { Option } from "@commander-js/extra-typings"
import { authSchemes } from "../../../../llm/connection/schema.ts"

export function createAuthOption() {
    return new Option(
        "-a, --auth <auth>",
        "how anthropic-messages sends the API key: x-api-key (the default) or bearer, an Authorization: Bearer header",
    ).choices(authSchemes)
}
