import { Option } from "@commander-js/extra-typings"

export function createApiIdOption() {
    return new Option(
        "-a, --api-id <api-id>",
        "id of the model on the provider's side, as its API expects it, e.g. claude-opus-5-5 or llama3.1:8b",
    )
}
