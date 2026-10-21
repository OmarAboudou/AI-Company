import { Option } from "@commander-js/extra-typings"

export function createBaseUrlOption() {
    return new Option(
        "-u, --base-url <url>",
        "URL the protocol's paths are appended to, e.g. https://api.anthropic.com",
    )
}
