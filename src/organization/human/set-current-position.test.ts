import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { join } from "node:path"
import { UserError } from "../../user-error.ts"
import { createTemporaryCompany } from "../company/create-temporary-company.testing.ts"
import { saveEmployee } from "../employee/storage.ts"
import { assignPosition } from "../position/assign-position.ts"
import { savePosition } from "../position/storage.ts"
import { setCurrentPosition } from "./set-current-position.ts"

let environment: NodeJS.ProcessEnv
let projectRoot: string

beforeEach(async () => {
    environment = {}
    projectRoot = await createTemporaryCompany()
    await Promise.all([
        saveEmployee(projectRoot, {
            id: "julie",
            name: "Julie",
            kind: "human",
        }),
        savePosition(projectRoot, {
            id: "graphics",
            title: "Graphics",
            description: "",
        }),
    ])
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

describe("setCurrentPosition", () => {
    test("selects a position the director works", async () => {
        const position = await setCurrentPosition(
            projectRoot,
            environment,
            "director",
        )

        expect(position.id).toBe("director")
    })

    test("selects a position the human employee works", async () => {
        await assignPosition(projectRoot, "graphics", "julie")
        environment.AICO_CURRENT_HUMAN_ID = "julie"

        const position = await setCurrentPosition(
            projectRoot,
            environment,
            "graphics",
        )

        expect(position.id).toBe("graphics")
    })

    test("refuses a position the human doesn't work, saying how to", async () => {
        environment.AICO_CURRENT_HUMAN_ID = "julie"

        const selection = setCurrentPosition(
            projectRoot,
            environment,
            "graphics",
        )

        await expect(selection).rejects.toThrow(UserError)
        await expect(selection).rejects.toThrow("assign-temporarily employee")
    })

    test("refuses an unknown position", async () => {
        const selection = setCurrentPosition(
            projectRoot,
            environment,
            "support",
        )

        await expect(selection).rejects.toThrow('No position "support".')
    })

    test("refuses to run outside a company", async () => {
        const folderWithoutCompany = join(projectRoot, "elsewhere")

        const selection = setCurrentPosition(
            folderWithoutCompany,
            environment,
            "director",
        )

        await expect(selection).rejects.toThrow("Run `aico init` first.")
    })
})
