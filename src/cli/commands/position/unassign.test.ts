import { beforeEach, describe, expect, test } from "bun:test"
import { createLlmConnection } from "../../../llm/connection/create-llm-connection.ts"
import { createLlmModel } from "../../../llm/model/create-llm-model.ts"
import { createLlmProvider } from "../../../llm/provider/create-llm-provider.ts"
import { createCompany } from "../../../organization/company/create-company.ts"
import { createEmployee } from "../../../organization/employee/create-employee.ts"
import { createPosition } from "../../../organization/position/create-position.ts"
import { useTemporaryProject } from "../../use-temporary-project.testing.ts"

const { runCli, getProjectPath } = useTemporaryProject()

describe("aico position assign and unassign", () => {
    beforeEach(async () => {
        const projectRoot = getProjectPath()
        await createCompany(projectRoot, { name: "Acme", description: "" })
        await Promise.all([
            createPosition(projectRoot, "developer", {
                title: "Developer",
                description: "",
            }),
            createPosition(projectRoot, "qa-tester", {
                title: "QA Tester",
                description: "",
            }),
            createEmployee(projectRoot, "omar", {
                name: "Omar",
                kind: "human",
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
    })

    async function loadPositionConfigFile(id: string): Promise<unknown> {
        const path = getProjectPath(".aico", "positions", id, "config.json")
        return Bun.file(path).json()
    }

    test("unassign makes the position vacant", async () => {
        runCli("position", "assign", "developer", "omar")

        const unassignment = runCli("position", "unassign", "developer")

        expect(unassignment.exitCode).toBe(0)
        expect(unassignment.stdout).toContain(
            '"omar" is no longer its default employee',
        )
        expect(await loadPositionConfigFile("developer")).toEqual({
            title: "Developer",
        })
    })

    test("unassign says so when the position is already vacant", () => {
        const unassignment = runCli("position", "unassign", "developer")

        expect(unassignment.exitCode).toBe(0)
        expect(unassignment.stdout).toContain("already vacant")
    })
})
