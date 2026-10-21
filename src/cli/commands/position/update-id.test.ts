import { beforeEach, describe, expect, test } from "bun:test"
import { createCompany } from "../../../organization/company/create-company.ts"
import { createPosition } from "../../../organization/position/create-position.ts"
import { useTemporaryProject } from "../../use-temporary-project.testing.ts"

const { runCli, getProjectPath } = useTemporaryProject()

describe("llmco position update-id", () => {
    beforeEach(async () => {
        const projectRoot = getProjectPath()
        await createCompany(projectRoot, { name: "Acme", description: "" })
        await Promise.all([
            createPosition(projectRoot, "developer", {
                title: "Dev",
                description: "Code.",
            }),
            createPosition(projectRoot, "qa-tester", {
                title: "QA",
                description: "",
            }),
        ])
    })

    test("update-id moves the position to its new id", () => {
        const update = runCli("position", "update-id", "developer", "api-dev")
        const show = runCli("position", "show", "api-dev").stdout

        expect(update.stdout).toBe('Position "developer" is now "api-dev".\n')
        expect(show).toBe(
            "# Dev\n\ncurrent employee: (vacant)\ndefault employee: (none)\n\nCode.\n",
        )
        expect(runCli("position", "show", "developer").exitCode).toBe(1)
    })

    test("update-id refuses an id another position has", () => {
        const update = runCli("position", "update-id", "developer", "qa-tester")
        const show = runCli("position", "show", "qa-tester").stdout

        expect(update.exitCode).toBe(1)
        expect(update.stderr).toContain('Position "qa-tester" already exists.')
        expect(show).toStartWith("# QA\n")
    })
})
