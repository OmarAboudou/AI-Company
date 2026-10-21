import { expect, test } from "bun:test"
import { useTemporaryProject } from "./use-temporary-project.testing.ts"

const { runCli } = useTemporaryProject()

test.each([
    ["position", "create", ".llmco/positions"],
    ["employee", "show", ".llmco/employees"],
    ["provider", "show", ".llmco/llm-providers"],
    ["model", "show", ".llmco/llm-providers/<provider-id>/models"],
])("%s %s --help says the id names a folder in %s", (group, verb, folder) => {
    const help = runCli(group, verb, "--help").stdout
    const unwrappedHelp = help.replace(/\s+/g, " ")

    expect(unwrappedHelp).toContain(`the name of its folder in ${folder}`)
})

test("prints the --help output for an unknown command", () => {
    const help = runCli("--help")
    const unknownCommandRun = runCli("unknown")

    expect(help.exitCode).toBe(0)
    expect(unknownCommandRun.exitCode).toBe(1)
    expect(unknownCommandRun.stderr).toContain(help.stdout)
})
