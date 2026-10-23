import { beforeEach, describe, expect, test } from "bun:test"
import { createExampleTicket } from "../../../messaging/ticket/create-example-ticket.testing.ts"
import { createCompany } from "../../../organization/company/create-company.ts"
import { createPosition } from "../../../organization/position/create-position.ts"
import { useTemporaryProject } from "../../use-temporary-project.testing.ts"

const { runCli, getProjectPath } = useTemporaryProject()

describe("aico ticket list", () => {
    beforeEach(async () => {
        const projectRoot = getProjectPath()
        await createCompany(projectRoot, { name: "Acme" })
        await createPosition(projectRoot, "developer", {
            title: "Developer",
            description: "",
        })
    })

    test("says when there are no tickets yet", () => {
        const listing = runCli("ticket", "list")

        expect(listing.exitCode).toBe(0)
        expect(listing.stdout).toBe("No tickets yet.\n")
    })

    test("lists the tickets by number, with their state and positions", async () => {
        const projectRoot = getProjectPath()
        await createExampleTicket(projectRoot, {
            title: "Choose the API framework",
            rawAssigneePositionId: "developer",
        })
        await createExampleTicket(projectRoot, { title: "Plan the release" })

        const listing = runCli("ticket", "list")

        expect(listing.stdout).toBe(
            "#1  open  @founder → @developer  Choose the API framework\n" +
                "#2  open  @founder → @founder    Plan the release\n",
        )
    })
})
