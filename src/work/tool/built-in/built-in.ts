import type { Tool } from "../define-tool.ts"
import { messageSendTool } from "./message/send.ts"
import { ticketAnswerTool } from "./ticket/answer.ts"
import { ticketAskTool } from "./ticket/ask.ts"
import { ticketCancelTool } from "./ticket/cancel.ts"
import { ticketCreateTool } from "./ticket/create.ts"
import { ticketDeliverTool } from "./ticket/deliver.ts"
import { ticketRefuseTool } from "./ticket/refuse.ts"
import { ticketShowTool } from "./ticket/show.ts"
import { ticketValidateTool } from "./ticket/validate.ts"

export const builtInTools = {
    message_send: messageSendTool,
    ticket_answer: ticketAnswerTool,
    ticket_ask: ticketAskTool,
    ticket_cancel: ticketCancelTool,
    ticket_create: ticketCreateTool,
    ticket_deliver: ticketDeliverTool,
    ticket_refuse: ticketRefuseTool,
    ticket_show: ticketShowTool,
    ticket_validate: ticketValidateTool,
} satisfies Record<string, Tool>

export type BuiltInToolName = keyof typeof builtInTools
