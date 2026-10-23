import type { Command } from "@commander-js/extra-typings"
import { loadJournal } from "../../../journal/storage.ts"
import { listThreads } from "../../../messaging/thread/storage.ts"
import { requireCompany } from "../../../organization/company/require-company.ts"
import { loadPendingPositionIdsByThread } from "../../../work/task/load-pending-position-ids-by-thread.ts"
import { printColumns } from "../../print-columns.ts"
import { projectRoot } from "../../project-root.ts"
import { formatPositionIds } from "./format-position-ids.ts"

export function registerThreadListCommand(threadCommand: Command): void {
    threadCommand
        .command("list")
        .description(
            "List the threads, oldest first, with the positions that have a pending task there.",
        )
        .action(async () => {
            await requireCompany(projectRoot)
            const [threads, pendingPositionIdsByThread] = await Promise.all([
                listThreads(projectRoot),
                loadJournal(projectRoot).then(loadPendingPositionIdsByThread),
            ])
            if (threads.length === 0) {
                console.log("No threads yet. Run `aico thread create`.")
                return
            }
            printColumns(
                threads.map((thread) => {
                    const pendingPositionIds =
                        pendingPositionIdsByThread.get(thread.id) ?? []
                    return [
                        thread.id,
                        thread.subject,
                        pendingPositionIds.length > 0
                            ? `tasks pending for ${formatPositionIds(pendingPositionIds)}`
                            : "",
                    ]
                }),
            )
        })
}
