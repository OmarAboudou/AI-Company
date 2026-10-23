import { beforeEach, describe, expect, test } from "bun:test"
import { createLlmConnection } from "../../../llm/connection/create-llm-connection.ts"
import { createLlmModel } from "../../../llm/model/create-llm-model.ts"
import { createLlmProvider } from "../../../llm/provider/create-llm-provider.ts"
import { createCompany } from "../../../organization/company/create-company.ts"
import { createEmployee } from "../../../organization/employee/create-employee.ts"
import { createPosition } from "../../../organization/position/create-position.ts"
import { useTemporaryProject } from "../../use-temporary-project.testing.ts"

const { runCli, getProjectPath } = useTemporaryProject()

describe("aico position assign", () => {
    beforeEach(async () => {
        const projectRoot = getProjectPath()
        await createCompany(projectRoot, { name: "Acme" })
        await Promise.all([
            createPosition(projectRoot, "developer", {
                title: "Developer",
                description: "",
            }),
            createPosition(projectRoot, "qa-tester", {
                title: "QA Tester",
                description: "",
            }),
            createLlmProvider(projectRoot, "anthropic", { name: "Anthropic" }),
        ])
        await createLlmConnection(
            projectRoot,
            "anthropic",
            "anthropic-messages",
            { baseUrl: "https://api.anthropic.com" },
        )
        await createLlmModel(projectRoot, "anthropic", "claude-opus-5-5", {
            name: "Claude Opus 5.5",
            apiId: "claude-opus-5-5",
        })
        await createEmployee(projectRoot, "claude-senior", {
            name: "Claude Senior",
            kind: "llm",
            providerId: "anthropic",
            modelId: "claude-opus-5-5",
        })
        await createEmployee(projectRoot, "omar", {
            name: "Omar",
            kind: "llm",
            providerId: "anthropic",
            modelId: "claude-opus-5-5",
        })
    })

    async function loadPositionConfigFile(id: string): Promise<unknown> {
        const path = getProjectPath(".aico", "positions", id, "config.json")
        return Bun.file(path).json()
    }

    test("assign gives an employee the position the user held", async () => {
        const assignment = runCli("position", "assign", "developer", "omar")

        expect(assignment.exitCode).toBe(0)
        expect(assignment.stdout).toBe(
            '"omar" now holds position "developer".\n',
        )
        expect(await loadPositionConfigFile("developer")).toEqual({
            title: "Developer",
            employeeId: "omar",
        })
    })

    test("assign refuses to replace the employee holding it without --replace", async () => {
        runCli("position", "assign", "developer", "claude-senior")

        const assignment = runCli("position", "assign", "developer", "omar")

        expect(assignment.exitCode).toBe(1)
        expect(assignment.stderr).toBe(
            '"claude-senior" already holds position "developer". Add --replace to replace it.\n',
        )
        expect(await loadPositionConfigFile("developer")).toEqual({
            title: "Developer",
            employeeId: "claude-senior",
        })
    })

    test.each(["--replace", "-r"])(
        "assign %s replaces the employee holding it",
        async (flag) => {
            runCli("position", "assign", "developer", "claude-senior")

            const assignment = runCli(
                "position",
                "assign",
                "developer",
                "omar",
                flag,
            )

            expect(assignment.exitCode).toBe(0)
            expect(assignment.stdout).toBe(
                '"omar" replaces "claude-senior" in position "developer".\n',
            )
            expect(await loadPositionConfigFile("developer")).toEqual({
                title: "Developer",
                employeeId: "omar",
            })
        },
    )

    test("assign accepts the employee holding it again", () => {
        runCli("position", "assign", "developer", "omar")

        const reassignment = runCli("position", "assign", "developer", "omar")

        expect(reassignment.exitCode).toBe(0)
        expect(reassignment.stdout).toBe(
            '"omar" already holds position "developer".\n',
        )
    })
})
