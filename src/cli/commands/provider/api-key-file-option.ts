import { Option } from "@commander-js/extra-typings"

export function apiKeyFileOption() {
    return new Option(
        "-k, --api-key-file <path>",
        "read the API key from this file: absolute, starting with ~, or relative to the project's root",
    ).conflicts("apiKeyEnv")
}
