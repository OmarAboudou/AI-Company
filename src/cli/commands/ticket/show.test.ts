import { beforeEach, describe, expect, test } from "bun:test"
import { createExampleTicket } from "../../../messaging/ticket/create-example-ticket.testing.ts"
import { createCompany } from "../../../organization/company/create-company.ts"
import { createPosition } from "../../../organization/position/create-position.ts"
import { createExampleWorkCatalog } from "../../../work/create-example-work-catalog.testing.ts"
import { sendExampleMessage } from "../../../work/send-example-message.testing.ts"
import { useTemporaryProject } from "../../use-temporary-project.testing.ts"

const { runCli, getProjectPath } = useTemporaryProject()

async function createFrameworkTicket(): Promise<number> {
    const projectRoot = getProjectPath()
    const ticket = await createExampleTicket(projectRoot, {
        title: "Choose the API framework",
        request: "Hono or Express?",
        rawAssigneePositionId: "developer",
    })
    await sendExampleMessage(
        projectRoot,
        ticket.number,
        "For Bun, if possible.",
        createExampleWorkCatalog(),
    )
    return ticket.number
}

describe("aico ticket show", () => {
    beforeEach(async () => {
        const projectRoot = getProjectPath()
        await createCompany(projectRoot, { name: "Acme" })
        await createPosition(projectRoot, "developer", {
            title: "Developer",
            description: "",
        })
    })

    test("shows the ticket, its state, its request and its discussion", async () => {
        const ticketNumber = await createFrameworkTicket()

        const showing = runCli("ticket", "show", String(ticketNumber))

        expect(showing.exitCode).toBe(0)
        expect(showing.stdout.split("\n")).toEqual([
            "# #1 Choose the API framework",
            "",
            expect.stringMatching(
                /^Asked by Test User, Founder \(@founder\), to Developer \(@developer\), .+ UTC\.$/,
            ),
            "State: open, @developer has the hand.",
            "",
            "Hono or Express?",
            "",
            expect.stringMatching(
                /^## Test User, Founder \(@founder\) · .+ UTC$/,
            ),
            "",
            "For Bun, if possible.",
            "",
        ])
    })

    test("takes the ticket's number after a #", async () => {
        await createFrameworkTicket()

        const showing = runCli("ticket", "show", "#1")

        expect(showing.stdout).toStartWith("# #1 Choose the API framework")
    })

    test("prints one JSON message per line with --json", async () => {
        await createFrameworkTicket()

        const showing = runCli("ticket", "show", "1", "--json")

        const [line, ...otherLines] = showing.stdout.trimEnd().split("\n")
        expect(otherLines).toEqual([])
        expect(JSON.parse(line ?? "")).toMatchObject({
            position: { id: "founder" },
            body: "For Bun, if possible.",
        })
    })

    test("refuses a ticket that doesn't exist", () => {
        const showing = runCli("ticket", "show", "4")

        expect(showing.exitCode).toBe(1)
        expect(showing.stderr).toBe("No ticket #4. Run `aico ticket list`.\n")
    })
})
