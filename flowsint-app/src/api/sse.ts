import { fetchEventSource } from '@microsoft/fetch-event-source'
import { useAuthStore } from '@/stores/auth-store'

/**
 * Outer SSE envelope from the server. `data` is forwarded exactly as received;
 * for the log/status streams it is itself a JSON-encoded string that the
 * consumer parses (e.g. `JSON.parse(envelope.data)`).
 */
export type SSEEnvelope = { event: string; data: unknown }

/** Thrown to tell fetch-event-source to stop retrying (e.g. auth failure). */
class FatalSSEError extends Error {}

const MAX_BACKOFF_MS = 30000

/**
 * Open an authenticated SSE connection.
 * Reads the bearer token once at connect time and sends it via the
 * Authorization header. Returns a disposer that aborts the connection.
 */
export function connectSSE(opts: {
  url: string
  onMessage: (msg: SSEEnvelope) => void
  onError?: (err: unknown) => void
}): () => void {
  const controller = new AbortController()
  let retry = 0

  const token = useAuthStore.getState().token
  const headers: Record<string, string> = token
    ? { Authorization: `Bearer ${token}` }
    : {}

  fetchEventSource(opts.url, {
    signal: controller.signal,
    openWhenHidden: true,
    headers,
    onopen: async (res) => {
      const contentType = res.headers.get('content-type') ?? ''
      if (!res.ok || !contentType.includes('text/event-stream')) {
        throw new FatalSSEError(`SSE open failed: ${res.status}`)
      }
      retry = 0
    },
    onmessage: (ev) => {
      if (!ev.data) return
      let envelope: SSEEnvelope
      try {
        envelope = JSON.parse(ev.data) as SSEEnvelope
      } catch (error) {
        console.error('[connectSSE] malformed envelope:', error, ev.data)
        return
      }
      if (typeof envelope?.event !== 'string') return
      if (envelope.event === 'connected') return
      opts.onMessage(envelope)
    },
    onerror: (err) => {
      if (err instanceof FatalSSEError) {
        opts.onError?.(err)
        throw err // stop: no retry on auth/protocol failure
      }
      // transient failure: retry silently with exponential backoff (onError is not called)
      retry += 1
      return Math.min(1000 * 2 ** retry, MAX_BACKOFF_MS)
    },
  }).catch((err) => {
    if (!(err instanceof FatalSSEError)) opts.onError?.(err)
  })

  return () => controller.abort()
}
