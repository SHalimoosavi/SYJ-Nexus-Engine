type EventHandler<T = unknown> = (payload: T) => void | Promise<void>

/**
 * Minimal in-process event bus. This is the reference pattern for
 * modules/ — self-contained, optional functionality that layers on top
 * of core/ without core/ needing to know it exists.
 *
 * Example use: subscribe to 'lead.created' to fire a webhook, send a
 * notification, or trigger a downstream workflow, without editing
 * core/operational/dataLayer.ts itself.
 *
 * This intentionally stays in-process and dependency-free (no queue,
 * no broker) to honor the framework's zero-external-services default.
 * Swap in a real message broker here if your deployment needs
 * cross-process delivery — this module is the single seam for that.
 */
class NexusEventBus {
  private handlers = new Map<string, Set<EventHandler>>()

  on<T = unknown>(event: string, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set())
    }
    this.handlers.get(event)!.add(handler as EventHandler)
    return () => this.handlers.get(event)?.delete(handler as EventHandler)
  }

  async emit<T = unknown>(event: string, payload: T): Promise<void> {
    const set = this.handlers.get(event)
    if (!set) return
    for (const handler of set) {
      await handler(payload)
    }
  }
}

export const eventBus = new NexusEventBus()

/** Well-known event names emitted by core/operational — not exhaustive, extend as needed. */
export const NEXUS_EVENTS = {
  LEAD_CREATED: 'lead.created',
  LEAD_STAGE_CHANGED: 'lead.stage_changed',
  TRANSACTION_CREATED: 'transaction.created',
  COMPLIANCE_STATUS_CHANGED: 'compliance.status_changed'
} as const
