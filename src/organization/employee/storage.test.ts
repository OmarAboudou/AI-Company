import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { UserError } from "../../user-error.ts"
import type { Employee } from "./schema.ts"
import {
    copyEmployeeFolder,
    deleteEmployeeFolder,
    hasEmployee,
    listEmployees,
    loadEmployee,
    saveEmployee,
} from "./storage.ts"

let projectRoot: string

beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), "llmco-"))
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

const claude: Employee = {
    id: "claude-senior",
    name: "Claude Senior",
    kind: "llm",
    providerId: "anthropic",
    modelId: "claude-opus-5-5",
}

const omar: Employee = { id: "omar", name: "Omar Aboudou", kind: "human" }

describe("saveEmployee", () => {
    test("writes config.json in a folder named after the id", async () => {
        await saveEmployee(projectRoot, claude)

        const path = join(
            projectRoot,
            ".llmco",
            "employees",
            "claude-senior",
            "config.json",
        )
        expect(await Bun.file(path).text()).toBe(
            '{\n    "name": "Claude Senior",\n    "kind": "llm",\n    "providerId": "anthropic",\n    "modelId": "claude-opus-5-5"\n}\n',
        )
    })
})

describe("loadEmployee", () => {
    test.each([claude, omar])(
        "reads back what saveEmployee wrote for $kind",
        async (employee) => {
            await saveEmployee(projectRoot, employee)

            expect(await loadEmployee(projectRoot, employee.id)).toEqual(
                employee,
            )
        },
    )

    test("rejects an invalid config.json", async () => {
        await Bun.write(
            join(projectRoot, ".llmco", "employees", "omar", "config.json"),
            JSON.stringify({ name: "Omar", kind: "human", modelId: "x" }),
        )

        await expect(loadEmployee(projectRoot, "omar")).rejects.toThrow(
            UserError,
        )
    })

    test("fails when the employee does not exist", async () => {
        await expect(loadEmployee(projectRoot, "omar")).rejects.toThrow(
            UserError,
        )
    })
})

describe("hasEmployee", () => {
    test("is false before saving and true after", async () => {
        expect(await hasEmployee(projectRoot, "omar")).toBe(false)

        await saveEmployee(projectRoot, omar)

        expect(await hasEmployee(projectRoot, "omar")).toBe(true)
    })
})

describe("listEmployees", () => {
    test("is empty when no employee was ever created", async () => {
        expect(await listEmployees(projectRoot)).toEqual([])
    })

    test("returns every employee sorted by id", async () => {
        await saveEmployee(projectRoot, omar)
        await saveEmployee(projectRoot, claude)

        expect(await listEmployees(projectRoot)).toEqual([claude, omar])
    })
})

describe("deleteEmployeeFolder", () => {
    test("removes the employee's folder", async () => {
        await saveEmployee(projectRoot, omar)
        const before = await listEmployees(projectRoot)

        await deleteEmployeeFolder(projectRoot, omar.id)
        const after = await listEmployees(projectRoot)

        expect(before).toEqual([omar])
        expect(after).toEqual([])
    })
})

describe("copyEmployeeFolder", () => {
    test("copies the employee's folder under its new id", async () => {
        await saveEmployee(projectRoot, omar)
        const before = await listEmployees(projectRoot)

        await copyEmployeeFolder(projectRoot, omar.id, "omar-aboudou")
        const after = await listEmployees(projectRoot)

        expect(before).toEqual([omar])
        expect(after).toEqual([omar, { ...omar, id: "omar-aboudou" }])
    })
})
