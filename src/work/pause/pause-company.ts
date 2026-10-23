import { recordEvent } from "../../journal/record-event.ts"
import type { Journal } from "../../journal/schema.ts"
import { UserError } from "../../user-error.ts"
import { getCompanyPause } from "./get-company-pause.ts"
import { companyPausedEventType } from "./schema.ts"

export async function pauseCompany(journal: Journal): Promise<void> {
    if (getCompanyPause(journal.events) !== undefined) {
        throw new UserError(
            "The company is already paused. Run `aico company relaunch` to relaunch it.",
        )
    }
    await recordEvent(journal, companyPausedEventType, { depth: 0 })
}
