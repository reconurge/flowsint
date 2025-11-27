import { useEffect, useRef, useCallback } from 'react'
import { XTermTerminal, TerminalHandle } from './xterm-terminal'
import { formatLogEntry, formatWelcomeMessage } from './log-formatter'
import { Button } from '../ui/button'
import { RotateCcw, Trash2, Maximize2 } from 'lucide-react'
import { EventLevel } from '@/types'

interface LogEntry {
  type: EventLevel
  payload: {
    message: string
  }
  created_at: string
}

interface TerminalLogViewerProps {
  logs: LogEntry[]
  onRefresh?: () => void
  onClear?: () => void
}

export const TerminalLogViewer = ({
  logs,
  onRefresh,
  onClear
}: TerminalLogViewerProps) => {
  const terminalRef = useRef<TerminalHandle>(null)
  const previousLogsRef = useRef<LogEntry[]>([])
  const isInitializedRef = useRef(false)
  const logsRef = useRef(logs)

  // Keep logs ref in sync
  useEffect(() => {
    logsRef.current = logs
  }, [logs])

  // Initialize terminal with welcome message and existing logs
  const handleTerminalReady = useCallback(() => {
    if (!terminalRef.current) return

    console.log('[TerminalLogViewer] Terminal ready, initializing with logs', {
      logCount: logsRef.current.length,
      wasInitialized: isInitializedRef.current
    })

    // Write welcome message only if no logs
    if (logsRef.current.length === 0) {
      terminalRef.current.write(formatWelcomeMessage())
    } else {
      // Write all existing logs
      logsRef.current.forEach((log) => {
        const formattedLog = formatLogEntry(
          log.created_at,
          log.type,
          log.payload.message
        )
        terminalRef.current?.write(formattedLog)
      })
    }

    previousLogsRef.current = [...logsRef.current]
    isInitializedRef.current = true
  }, [])

  // Write new logs to terminal without causing re-renders
  useEffect(() => {
    if (!terminalRef.current || !isInitializedRef.current) {
      return
    }

    const previousLogs = previousLogsRef.current
    const currentLogs = logs
    // Find new logs by comparing timestamps and messages
    // This works even when the total length stays the same (e.g., 100 logs with slice)
    const newLogs = currentLogs.filter((currentLog) => {
      return !previousLogs.some(
        (prevLog) =>
          prevLog.created_at === currentLog.created_at &&
          prevLog.payload.message === currentLog.payload.message
      )
    })

    if (newLogs.length > 0) {
      console.log('[TerminalLogViewer] Writing new logs', newLogs.length)

      newLogs.forEach((log) => {
        const formattedLog = formatLogEntry(
          log.created_at,
          log.type,
          log.payload.message
        )
        terminalRef.current?.write(formattedLog)
      })
    }

    // Check if logs were cleared (much shorter than before)
    if (currentLogs.length < previousLogs.length / 2) {
      console.log('[TerminalLogViewer] Logs cleared, resetting terminal')
      terminalRef.current.clear()

      if (currentLogs.length === 0) {
        terminalRef.current.write(formatWelcomeMessage())
      } else {
        // Write all current logs
        currentLogs.forEach((log) => {
          const formattedLog = formatLogEntry(
            log.created_at,
            log.type,
            log.payload.message
          )
          terminalRef.current?.write(formattedLog)
        })
      }
    }

    // Update previous logs reference
    previousLogsRef.current = [...currentLogs]
  }, [logs])

  const handleClearTerminal = useCallback(() => {
    terminalRef.current?.clear()
    terminalRef.current?.write(formatWelcomeMessage())
    onClear?.()
  }, [onClear])

  const handleRefresh = useCallback(() => {
    onRefresh?.()
  }, [onRefresh])

  return (
    <div className="h-full flex flex-col relative bg-background rounded-lg overflow-hidden border border-border/50">
      {/* Terminal */}
      <div className="flex-1 min-h-0">
        <XTermTerminal
          ref={terminalRef}
          className="h-full w-full p-2"
          onReady={handleTerminalReady}
        />
      </div>

      {/* Controls */}
      <div className="absolute top-2 right-2 flex gap-1 z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          className="h-7 w-7 bg-background/80 backdrop-blur-sm hover:bg-background/90 border border-border/50"
          title="Refresh logs"
        >
          <RotateCcw className="w-3.5 h-3.5 opacity-60" strokeWidth={1.7} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClearTerminal}
          className="h-7 w-7 bg-background/80 backdrop-blur-sm hover:bg-background/90 border border-border/50"
          title="Clear terminal"
        >
          <Trash2 className="w-3.5 h-3.5 opacity-60" strokeWidth={1.7} />
        </Button>

      </div>
    </div>
  )
}
