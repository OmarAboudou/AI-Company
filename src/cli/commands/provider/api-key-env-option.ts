import { Option } from "@commander-js/extra-typings"

export function apiKeyEnvOption() {
    return new Option(
        "-e, --api-key-env <variable>",
        "read the API key from this environment variable, e.g. ANTHROPIC_API_KEY",
    )
}
