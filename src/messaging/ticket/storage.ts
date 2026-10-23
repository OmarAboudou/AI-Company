import { join } from "node:path"
import { getAicoFolderPath } from "../../files/get-aico-folder-path.ts"
import { listSubdirectories } from "../../files/list-subdirectories.ts"
import { readJsonFile } from "../../files/read-json-file.ts"
import { readTextFile } from "../../files/read-text-file.ts"
import { saveNewJsonFile } from "../../files/save-new-json-file.ts"
import { type Ticket, TicketConfigSchema } from "./schema.ts"

function getTicketsFolderPath(projectRoot: string): string {
    return join(getAicoFolderPath(projectRoot), "tickets")
}

export function getTicketFolderPath(
    projectRoot: string,
    number: number,
): string {
    return join(getTicketsFolderPath(projectRoot), String(number))
}

function getTicketFilePaths(projectRoot: string, number: number) {
    const ticketFolderPath = getTicketFolderPath(projectRoot, number)
    return {
        config: join(ticketFolderPath, "ticket.json"),
        request: join(ticketFolderPath, "request.md"),
    }
}

export async function listTicketNumbers(
    projectRoot: string,
): Promise<number[]> {
    const folderNames = await listSubdirectories(
        getTicketsFolderPath(projectRoot),
    )
    return folderNames
        .filter((folderName) => /^[1-9]\d*$/.test(folderName))
        .map(Number)
        .sort((number, otherNumber) => number - otherNumber)
}

export async function hasTicket(
    projectRoot: string,
    number: number,
): Promise<boolean> {
    return Bun.file(getTicketFilePaths(projectRoot, number).config).exists()
}

export async function loadTicket(
    projectRoot: string,
    number: number,
): Promise<Ticket> {
    const paths = getTicketFilePaths(projectRoot, number)
    const [config, request] = await Promise.all([
        readJsonFile(projectRoot, paths.config, TicketConfigSchema),
        readTextFile(projectRoot, paths.request),
    ])
    return { number, ...config, request }
}

export async function listTickets(projectRoot: string): Promise<Ticket[]> {
    const ticketNumbers = await listTicketNumbers(projectRoot)
    return Promise.all(
        ticketNumbers.map((number) => loadTicket(projectRoot, number)),
    )
}

export async function saveNewTicket(
    projectRoot: string,
    ticket: Ticket,
): Promise<void> {
    const { number, request, ...config } = ticket
    const paths = getTicketFilePaths(projectRoot, number)
    // ticket.json is written first, and only if missing: the ticket's
    // number is taken once its folder exists, even should the creation
    // stop before its request is written.
    await saveNewJsonFile(paths.config, config)
    await Bun.write(paths.request, request)
}
