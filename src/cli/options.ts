import { Option } from "@commander-js/extra-typings"

export function createDescriptionFileOption() {
    return new Option(
        "-F, --description-file <path>",
        "read the description from a file, or from stdin with -",
    ).conflicts("description")
}
