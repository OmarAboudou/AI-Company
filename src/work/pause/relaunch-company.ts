import { recordEvent } from "../../journal/record-event.ts"
import type { Journal } from "../../journal/schema.ts"
import { UserError } from "../../user-error.ts"
import { getCompanyPause } from "./get-company-pause.ts"
import { companyRelaunchedEventType } from "./schema.ts"

export async function relaunchCompany(journal: Journal): Promise<void> {
    if (getCompanyPause(journal.events) === undefined) {
        throw new UserError("The company isn't paused: nothing to relaunch.")
    }
    await recordEvent(journal, companyRelaunchedEventType, { depth: 0 })
}
