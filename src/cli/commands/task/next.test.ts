import { beforeEach, describe, expect, test } from "bun:test"
import { createCompany } from "../../../organization/company/create-company.ts"
import { createPosition } from "../../../organization/position/create-position.ts"
import { useTemporaryProject } from "../../use-temporary-project.testing.ts"

const { runCli, runCliWithEnv, getProjectPath } = useTemporaryProject()

describe("aico task next", () => {
    beforeEach(async () => {
        await createCompany(getProjectPath(), { name: "Acme" })
    })

    test("opens the director's What now?, which always waits", () => {
        const next = runCli("task", "next")

        expect(next.exitCode).toBe(0)
        expect(next.stdout).toContain(
            "What now? Choose what the company does next",
        )
    })

    test("says when no task waits in the selected position", async () => {
        const projectRoot = getProjectPath()
        await createPosition(projectRoot, "qa-tester", {
            title: "QA",
            description: "",
        })

        const next = runCliWithEnv(
            { AICO_CURRENT_POSITION_ID: "qa-tester" },
            "task",
            "next",
        )

        expect(next.exitCode).toBe(0)
        expect(next.stdout).toBe("No task waits for you.\n")
    })
})
