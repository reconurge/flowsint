import { describe, it, expect, vi, beforeEach } from 'vitest'

// Capture the options passed to fetchEventSource so we can drive its callbacks.
const calls: any[] = []
const fetchEventSourceMock = vi.fn((url: string, opts: any) => {
  calls.push({ url, opts })
  return new Promise(() => {}) // never resolves; we drive callbacks manually
})

vi.mock('@microsoft/fetch-event-source', () => ({
  fetchEventSource: (url: string, opts: any) => fetchEventSourceMock(url, opts),
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: { getState: () => ({ token: 'tok123' }) },
}))

import { connectSSE } from './sse'

const lastOpts = () => calls[calls.length - 1].opts

const fakeResponse = (status: number, contentType: string) =>
  ({ ok: status >= 200 && status < 300, status, headers: { get: () => contentType } } as any)

beforeEach(() => {
  calls.length = 0
  fetchEventSourceMock.mockClear()
})

describe('connectSSE', () => {
  it('passes the URL and Authorization header from the store', () => {
    connectSSE({ url: 'http://x/stream', onMessage: () => {} })
    expect(calls[0].url).toBe('http://x/stream')
    expect(lastOpts().headers).toEqual({ Authorization: 'Bearer tok123' })
  })

  it('forwards parsed envelopes and skips "connected"', () => {
    const received: any[] = []
    connectSSE({ url: 'http://x', onMessage: (m) => received.push(m) })
    const o = lastOpts()
    o.onmessage({ data: JSON.stringify({ event: 'connected', data: 'hi' }) })
    o.onmessage({ data: JSON.stringify({ event: 'log', data: '{"msg":"a"}' }) })
    expect(received).toEqual([{ event: 'log', data: '{"msg":"a"}' }])
  })

  it('ignores empty and malformed messages without throwing', () => {
    const received: any[] = []
    connectSSE({ url: 'http://x', onMessage: (m) => received.push(m) })
    const o = lastOpts()
    o.onmessage({ data: '' })
    o.onmessage({ data: 'not-json' })
    expect(received).toEqual([])
  })

  it('aborts the request when the disposer is called', () => {
    const dispose = connectSSE({ url: 'http://x', onMessage: () => {} })
    expect(lastOpts().signal.aborted).toBe(false)
    dispose()
    expect(lastOpts().signal.aborted).toBe(true)
  })

  it('throws (no retry) on a non-event-stream open', async () => {
    connectSSE({ url: 'http://x', onMessage: () => {} })
    await expect(lastOpts().onopen(fakeResponse(401, 'application/json'))).rejects.toThrow()
  })

  it('accepts a valid event-stream open', async () => {
    connectSSE({ url: 'http://x', onMessage: () => {} })
    await expect(
      lastOpts().onopen(fakeResponse(200, 'text/event-stream'))
    ).resolves.toBeUndefined()
  })

  it('returns increasing backoff for transient errors', () => {
    connectSSE({ url: 'http://x', onMessage: () => {} })
    const o = lastOpts()
    const first = o.onerror(new Error('network'))
    const second = o.onerror(new Error('network'))
    expect(first).toBe(2000)
    expect(second).toBe(4000)
  })

  it('rethrows fatal errors from onerror to stop retrying', async () => {
    connectSSE({ url: 'http://x', onMessage: () => {} })
    const o = lastOpts()
    let fatal: unknown
    try {
      await o.onopen(fakeResponse(403, 'application/json'))
    } catch (e) {
      fatal = e
    }
    expect(() => o.onerror(fatal)).toThrow()
  })

  it('ignores valid JSON that is not an envelope', () => {
    const received: any[] = []
    connectSSE({ url: 'http://x', onMessage: (m) => received.push(m) })
    const o = lastOpts()
    o.onmessage({ data: '42' })
    o.onmessage({ data: 'null' })
    o.onmessage({ data: '{"data":"no-event"}' })
    expect(received).toEqual([])
  })

  it('calls onError once when the connection promise rejects (non-fatal)', async () => {
    const errors: unknown[] = []
    fetchEventSourceMock.mockImplementationOnce((url: string, opts: any) => {
      calls.push({ url, opts })
      return Promise.reject(new Error('boom'))
    })
    connectSSE({ url: 'http://x', onMessage: () => {}, onError: (e) => errors.push(e) })
    await Promise.resolve()
    await Promise.resolve()
    expect(errors).toHaveLength(1)
    expect((errors[0] as Error).message).toBe('boom')
  })
})
