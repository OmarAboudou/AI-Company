import { beforeEach, describe, expect, test } from "bun:test"
import { useTemporaryProject } from "../../use-temporary-project.testing.ts"

const { runCli } = useTemporaryProject()

const interimEmployee = ["position", "interim", "employee"]
const interimDirectors = ["position", "interim", "directors"]

describe("llmco position", () => {
    beforeEach(() => {
        runCli("init", "--name", "Acme")
    })

    test("show fails for an unknown position", () => {
        expect(runCli("position", "show", "developer").exitCode).toBe(1)
    })
})

describe("llmco position assign-temporarily and unassign-temporarily", () => {
    beforeEach(() => {
        runCli("init", "-n", "Acme")
        runCli("position", "create", "developer", "-t", "Developer")
        runCli("position", "create", "designer", "-t", "Designer")
        runCli("employee", "create", "human", "omar", "-n", "Omar")
        runCli("employee", "create", "human", "julie", "-n", "Julie")
        runCli("employee", "create", "human", "bob", "-n", "Bob")
        runCli("position", "assign", "developer", "omar")
    })

    test("show says who works the position temporarily", () => {
        runCli(...interimEmployee, "developer", "julie")
        runCli(...interimDirectors, "designer")

        const developerShow = runCli("position", "show", "developer").stdout
        const designerShow = runCli("position", "show", "designer").stdout

        expect(developerShow).toBe(
            "# Developer\n\ncurrent employee: julie (temporarily)\ndefault employee: omar\n\n\n",
        )
        expect(designerShow).toBe(
            "# Designer\n\ncurrent employee: the repository's git users (temporarily)\ndefault employee: (none)\n\n\n",
        )
    })
})
