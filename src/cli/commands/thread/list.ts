import type { Command } from "@commander-js/extra-typings"
import { getAwaitedIds } from "../../../messaging/thread/get-awaited-ids.ts"
import { listArchives } from "../../../messaging/thread/list-archives.ts"
import { requireCompany } from "../../../organization/company/require-company.ts"
import { listPositions } from "../../../organization/position/storage.ts"
import { printColumns } from "../../print-columns.ts"
import { projectRoot } from "../../project-root.ts"
import { formatMentions } from "./format-mentions.ts"

export function registerThreadListCommand(threadCommand: Command): void {
    threadCommand
        .command("list")
        .description(
            "List the threads, oldest first, with the positions they await.",
        )
        .action(async () => {
            await requireCompany(projectRoot)
            const [archives, positions] = await Promise.all([
                listArchives(projectRoot),
                listPositions(projectRoot),
            ])
            if (archives.length === 0) {
                console.log("No threads yet. Run `llmco thread create`.")
                return
            }
            printColumns(
                archives.map(({ thread, messages }) => {
                    const awaitedIds = getAwaitedIds(
                        thread,
                        messages,
                        positions,
                    )
                    return [
                        thread.id,
                        thread.subject,
                        awaitedIds.length > 0
                            ? `awaiting ${formatMentions(awaitedIds)}`
                            : "",
                    ]
                }),
            )
        })
}
