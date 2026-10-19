import { Option } from "@commander-js/extra-typings"

export function createBodyFileOption(bodyDescription = "the message") {
    return new Option(
        "-F, --body-file <path>",
        `read ${bodyDescription} from a file, or from stdin with -`,
    ).conflicts("body")
}
