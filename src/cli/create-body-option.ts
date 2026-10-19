import { Option } from "@commander-js/extra-typings"

export function createBodyOption(bodyDescription = "the message") {
    return new Option("-b, --body <text>", `${bodyDescription}, in Markdown`)
}
