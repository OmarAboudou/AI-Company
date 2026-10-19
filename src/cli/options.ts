import { Option } from "@commander-js/extra-typings"

export function createAsPositionOption() {
    return new Option(
        "-a, --as-position <position-id>",
        "position to write from, among those you work (see current-human); by default, the only one of them in the thread, else the director's or your only one",
    )
}

export function createBodyOption(bodyDescription = "the message") {
    return new Option("-b, --body <text>", `${bodyDescription}, in Markdown`)
}

export function createBodyFileOption(bodyDescription = "the message") {
    return new Option(
        "-F, --body-file <path>",
        `read ${bodyDescription} from a file, or from stdin with -`,
    ).conflicts("body")
}

export function createDescriptionFileOption() {
    return new Option(
        "-F, --description-file <path>",
        "read the description from a file, or from stdin with -",
    ).conflicts("description")
}
