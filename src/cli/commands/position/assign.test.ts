import { beforeEach, describe, expect, test } from "bun:test"
import { createLlmConnection } from "../../../llm/connection/create-llm-connection.ts"
import { createLlmModel } from "../../../llm/model/create-llm-model.ts"
import { createLlmProvider } from "../../../llm/provider/create-llm-provider.ts"
import { createCompany } from "../../../organization/company/create-company.ts"
import { createEmployee } from "../../../organization/employee/create-employee.ts"
import { assignPositionTemporarily } from "../../../organization/position/assign-position-temporarily.ts"
import { createPosition } from "../../../organization/position/create-position.ts"
import { useTemporaryProject } from "../../use-temporary-project.testing.ts"

const { runCli, getProjectPath } = useTemporaryProject()

function getPositionStatePath(id: string): string {
    return getProjectPath(".aico", ".state", "positions", `${id}.json`)
}

async function loadPositionStateFile(id: string): Promise<unknown> {
    const file = Bun.file(getPositionStatePath(id))
    return (await file.exists()) ? file.json() : undefined
}

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

    test("assign sets the default employee of a vacant position", async () => {
        const assignment = runCli("position", "assign", "developer", "omar")

        expect(assignment.exitCode).toBe(0)
        expect(assignment.stdout).toBe(
            '"omar" is now the default employee of position "developer".\n',
        )
        expect(await loadPositionConfigFile("developer")).toEqual({
            title: "Developer",
            defaultEmployeeId: "omar",
        })
    })

    test("assign refuses to replace a default employee without --replace", async () => {
        runCli("position", "assign", "developer", "claude-senior")

        const assignment = runCli("position", "assign", "developer", "omar")

        expect(assignment.exitCode).toBe(1)
        expect(assignment.stderr).toContain(
            'already has "claude-senior" as default employee',
        )
        expect(assignment.stderr).toContain("--replace")
        expect(await loadPositionConfigFile("developer")).toEqual({
            title: "Developer",
            defaultEmployeeId: "claude-senior",
        })
    })

    test.each(["--replace", "-r"])(
        "assign %s replaces the default employee",
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
                '"omar" replaces "claude-senior" as the default employee of position "developer".\n',
            )
            expect(await loadPositionConfigFile("developer")).toEqual({
                title: "Developer",
                defaultEmployeeId: "omar",
            })
        },
    )

    test("assign accepts the current default employee again", () => {
        runCli("position", "assign", "developer", "omar")

        const reassignment = runCli("position", "assign", "developer", "omar")

        expect(reassignment.exitCode).toBe(0)
        expect(reassignment.stdout).toContain("is already the default employee")
    })
})

describe("a temporary assignment through the position's lifecycle", () => {
    const julieState = {
        temporaryAssignment: { kind: "employee", employeeId: "julie" },
    }

    beforeEach(async () => {
        const projectRoot = getProjectPath()
        await createCompany(projectRoot, { name: "Acme", description: "" })
        await Promise.all([
            createPosition(projectRoot, "developer", {
                title: "Developer",
                description: "",
            }),
            createEmployee(projectRoot, "julie", {
                name: "Julie",
                kind: "human",
            }),
        ])
        await assignPositionTemporarily(projectRoot, "developer", {
            kind: "employee",
            rawEmployeeId: "julie",
        })
    })

    test("assign of the temporary assignee ends its temporary assignment", async () => {
        const before = await loadPositionStateFile("developer")

        const assignment = runCli("position", "assign", "developer", "julie")
        const show = runCli("position", "show", "developer").stdout

        expect(before).toEqual(julieState)
        expect(assignment.stdout).toBe(
            '"julie" is now the default employee of position "developer", which ends its temporary assignment.\n',
        )
        expect(await loadPositionStateFile("developer")).toBeUndefined()
        expect(show).toContain("default employee: julie\n\n")
    })

    test("assign and unassign of another employee keep the temporary assignment", async () => {
        runCli("employee", "create", "human", "bob", "-n", "Bob")

        const assignment = runCli("position", "assign", "developer", "bob")
        const unassignment = runCli("position", "unassign", "developer")

        const stillTemporaryMessage =
            ' It stays assigned temporarily to "julie".\n'
        expect(assignment.stdout).toEndWith(stillTemporaryMessage)
        expect(unassignment.stdout).toEndWith(stillTemporaryMessage)
        expect(await loadPositionStateFile("developer")).toEqual(julieState)
    })
})
