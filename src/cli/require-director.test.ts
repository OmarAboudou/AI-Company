import { beforeEach, describe, expect, test } from "bun:test"
import type { CommandUnknownOpts } from "@commander-js/extra-typings"
import { createProgram } from "./program.ts"
import { useTemporaryProject } from "./use-temporary-project.ts"

const { runCli, runCliWithEnv } = useTemporaryProject()

const asJulie = { LLMCO_CURRENT_HUMAN_ID: "julie" }

const connection = ["provider", "connection"]

const management: Record<string, string[]> = {
    init: ["init", "-n", "Acme"],
    "company update": ["company", "update", "-n", "Acme"],
    "position create": ["position", "create", "dev", "-t", "Dev"],
    "position update": ["position", "update", "dev", "-t", "Dev"],
    "position update-id": ["position", "update-id", "dev", "api-dev"],
    "position assign": ["position", "assign", "dev", "julie"],
    "position unassign": ["position", "unassign", "dev"],
    "position assign-temporarily employee": [
        ...["position", "interim", "employee", "dev", "julie"],
    ],
    "position assign-temporarily directors": [
        ...["position", "interim", "directors", "dev"],
    ],
    "position unassign-temporarily": ["position", "end-interim", "dev"],
    "position delete": ["position", "delete", "dev"],
    "employee create llm": [
        ...["employee", "create", "llm", "claude", "-n", "Claude"],
        ...["-p", "anthropic", "-m", "opus"],
    ],
    "employee create human": ["employee", "hire", "human", "bob", "-n", "Bob"],
    "employee update": ["employee", "update", "julie", "-n", "Julie"],
    "employee update-id": ["employee", "update-id", "julie", "julie-a"],
    "employee replace": ["employee", "replace", "julie", "bob"],
    "employee delete": ["employee", "delete", "julie"],
    "provider create": ["provider", "create", "anthropic", "-n", "A"],
    "provider update": ["provider", "update", "anthropic", "-n", "A"],
    "provider update-id": ["provider", "update-id", "anthropic", "a"],
    "provider delete": ["provider", "delete", "anthropic"],
    "provider connection create": [
        ...[...connection, "create", "anthropic", "anthropic-messages"],
        ...["-u", "https://api.anthropic.com"],
    ],
    "provider connection update": [
        ...[...connection, "update", "anthropic", "anthropic-messages"],
        ...["-u", "https://api.anthropic.com"],
    ],
    "provider connection delete": [
        ...[...connection, "delete", "anthropic", "anthropic-messages"],
    ],
    "model create": [
        ...["model", "create", "anthropic", "opus", "-n", "Opus"],
        ...["-a", "claude-opus-5-5"],
    ],
    "model update": ["model", "update", "anthropic", "opus", "-n", "Opus"],
    "model update-id": ["model", "update-id", "anthropic", "opus", "o"],
    "model delete": ["model", "delete", "anthropic", "opus"],
}

const free = [
    "company show",
    "position list",
    "position show",
    "employee list",
    "employee show",
    "provider list",
    "provider show",
    "provider connection list",
    "model list",
    "model show",
    "thread create",
    "thread list",
    "thread show",
    "message send",
    "whoami",
]

function leafCommands(command: CommandUnknownOpts): string[] {
    return command.commands.flatMap((subcommand) => {
        const leaves = leafCommands(subcommand)
        return leaves.length === 0
            ? [subcommand.name()]
            : leaves.map((leaf) => `${subcommand.name()} ${leaf}`)
    })
}

describe("management commands", () => {
    beforeEach(() => {
        runCli("init", "-n", "Acme")
        runCli("employee", "create", "human", "julie", "-n", "Julie")
    })

    test("every command is either reserved to directors or free", () => {
        const classified = [...Object.keys(management), ...free]

        expect(leafCommands(createProgram()).sort()).toEqual(classified.sort())
    })

    test.each(Object.entries(management))(
        "%s is reserved to directors",
        (name, args) => {
            const run = runCliWithEnv(asJulie, ...args)

            expect(run.exitCode).toBe(1)
            expect(run.stderr).toBe(
                `Only directors run \`llmco ${name}\`: LLMCO_CURRENT_HUMAN_ID has you act as "julie". Unset it to act as a director.\n`,
            )
        },
    )

    test("reading stays free", () => {
        const list = runCliWithEnv(asJulie, "position", "list")
        const show = runCliWithEnv(asJulie, "company", "show")

        expect(list.exitCode).toBe(0)
        expect(show.exitCode).toBe(0)
    })

    test("an empty LLMCO_CURRENT_HUMAN_ID is a director", () => {
        const env = { LLMCO_CURRENT_HUMAN_ID: "" }
        const create = ["position", "create", "dev", "-t", "Dev"]

        const creation = runCliWithEnv(env, ...create)

        expect(creation.exitCode).toBe(0)
    })
})
