/**
 * Centralized logging module for SYJ Nexus Engine.
 *
 * Every log line is structured JSON so it can be piped into any log
 * aggregator (or just read from stdout during development). Four
 * channels are supported: info, warn, error, audit. The audit channel
 * is distinct because audit entries are also persisted to the
 * audit_logs table by core/logging/audit.ts — this module only handles
 * the console/stdout side.
 */

type LogLevel = 'info' | 'warn' | 'error' | 'audit'

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  audit: 0,
  error: 1,
  warn: 2,
  info: 3
}

function configuredLevel(): LogLevel {
  const env = (process.env.LOG_LEVEL || 'info').toLowerCase()
  if (env === 'info' || env === 'warn' || env === 'error' || env === 'audit') return env
  return 'info'
}

function shouldLog(level: LogLevel): boolean {
  // audit and error always log regardless of configured threshold
  if (level === 'audit' || level === 'error') return true
  return LEVEL_WEIGHT[level] <= LEVEL_WEIGHT[configuredLevel()]
}

interface LogPayload {
  [key: string]: unknown
}

function emit(level: LogLevel, event: string, payload: LogPayload = {}): void {
  if (!shouldLog(level)) return

  const record = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...payload
  }

  const line = JSON.stringify(record)

  switch (level) {
    case 'error':
      console.error(line)
      break
    case 'warn':
      console.warn(line)
      break
    default:
      console.log(line)
  }
}

export const logger = {
  info(event: string, payload?: LogPayload) {
    emit('info', event, payload)
  },
  warn(event: string, payload?: LogPayload) {
    emit('warn', event, payload)
  },
  error(event: string, payload?: LogPayload) {
    emit('error', event, payload)
  },
  audit(event: string, payload?: LogPayload) {
    emit('audit', event, payload)
  }
}

export type { LogLevel }
