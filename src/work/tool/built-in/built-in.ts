import type { Tool } from "../define-tool.ts"
import { ticketAnswerTool } from "./ticket/answer.ts"
import { ticketAskTool } from "./ticket/ask.ts"
import { ticketCancelTool } from "./ticket/cancel.ts"
import { ticketCloseTool } from "./ticket/close.ts"
import { ticketCreateTool } from "./ticket/create.ts"
import { ticketDeliverTool } from "./ticket/deliver.ts"
import { ticketGiveBackTool } from "./ticket/give-back.ts"
import { ticketHandOverTool } from "./ticket/hand-over.ts"
import { ticketRefuseTool } from "./ticket/refuse.ts"
import { ticketRenounceTool } from "./ticket/renounce.ts"
import { ticketShowTool } from "./ticket/show.ts"
import { ticketValidateTool } from "./ticket/validate.ts"

export const builtInTools = {
    ticket_answer: ticketAnswerTool,
    ticket_ask: ticketAskTool,
    ticket_cancel: ticketCancelTool,
    ticket_close: ticketCloseTool,
    ticket_create: ticketCreateTool,
    ticket_deliver: ticketDeliverTool,
    "ticket_give-back": ticketGiveBackTool,
    "ticket_hand-over": ticketHandOverTool,
    ticket_refuse: ticketRefuseTool,
    ticket_renounce: ticketRenounceTool,
    ticket_show: ticketShowTool,
    ticket_validate: ticketValidateTool,
} satisfies Record<string, Tool>

export type BuiltInToolName = keyof typeof builtInTools
