import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  CONNECT_HINT,
  INITIAL_LOGIN_STATE,
  OrcaRouterLoginMachine,
  type LoginTransport
} from './orcarouter-login-machine'

/**
 * Tests for the OrcaRouter login lifecycle.
 *
 * These run in the repository's node test environment, which has no DOM — the
 * machine is deliberately framework-free so the parts that are easy to get
 * wrong are directly testable here.
 */

const ATTEMPT = 'attempt-1'
const AUTHORIZE_URL = 'https://www.orcarouter.ai/auth?callback_url=oob&state=s'

function makeTransport(overrides: Partial<LoginTransport> = {}) {
  const transport: LoginTransport = {
    start: vi.fn(async () => ({
      attempt_id: ATTEMPT,
      authorize_url: AUTHORIZE_URL
    })),
    complete: vi.fn(async () => ({ connected: true })),
    cancel: vi.fn(async () => undefined),
    ...overrides
  }
  return transport
}

describe('OrcaRouterLoginMachine — starting a login', () => {
  it('publishes the authorize URL and the hint, and stops being busy', async () => {
    const transport = makeTransport()
    const machine = new OrcaRouterLoginMachine(transport)

    await machine.start()

    expect(machine.getState().attemptId).toBe(ATTEMPT)
    expect(machine.getState().authorizeUrl).toBe(AUTHORIZE_URL)
    expect(machine.getState().hint).toBe(CONNECT_HINT)
    expect(machine.getState().busy).toBe(false)
  })

  it('notifies subscribers as state changes', async () => {
    const machine = new OrcaRouterLoginMachine(makeTransport())
    const seen: boolean[] = []
    machine.subscribe((state) => seen.push(state.busy))

    await machine.start()

    // start() first releases any prior attempt (not busy), then goes busy while
    // the server call is in flight, then settles.
    expect(seen).toContain(true)
    expect(seen[seen.length - 1]).toBe(false)
  })

  it('surfaces a start failure and does not stay busy', async () => {
    const transport = makeTransport({
      start: vi.fn(async () => {
        throw new Error('429 too many authorizations')
      })
    })
    const machine = new OrcaRouterLoginMachine(transport)

    await expect(machine.start()).rejects.toThrow('429')

    expect(machine.getState().busy).toBe(false)
    expect(machine.getState().attemptId).toBeNull()
  })
})

describe('OrcaRouterLoginMachine — completing a login', () => {
  it('clears the attempt and the hint on success', async () => {
    const transport = makeTransport()
    const machine = new OrcaRouterLoginMachine(transport)
    await machine.start()

    await machine.complete('the-code')

    expect(transport.complete).toHaveBeenCalledWith(ATTEMPT, 'the-code')
    expect(machine.getState().attemptId).toBeNull()
    expect(machine.getState().hint).toBeNull()
    expect(machine.getState().busy).toBe(false)
  })

  it('refuses an empty code without calling the server', async () => {
    const transport = makeTransport()
    const machine = new OrcaRouterLoginMachine(transport)
    await machine.start()

    await expect(machine.complete('   ')).rejects.toThrow()

    expect(transport.complete).not.toHaveBeenCalled()
  })

  it('keeps the attempt open on an exchange error so a retype is possible', async () => {
    const transport = makeTransport({
      complete: vi.fn(async () => {
        throw new Error('code is unknown, expired, or already used')
      })
    })
    const machine = new OrcaRouterLoginMachine(transport)
    await machine.start()

    await expect(machine.complete('bad-code')).rejects.toThrow()

    expect(machine.getState().busy).toBe(false)
    expect(machine.getState().attemptId).toBe(ATTEMPT)
  })

  it('throws when completing without an active attempt', async () => {
    const machine = new OrcaRouterLoginMachine(makeTransport())
    await expect(machine.complete('code')).rejects.toThrow('No authorization')
  })
})

describe('OrcaRouterLoginMachine — every terminal path releases the lock', () => {
  it('explicit cancel clears state and cancels server-side', async () => {
    const transport = makeTransport()
    const machine = new OrcaRouterLoginMachine(transport)
    await machine.start()

    machine.cancel()

    expect(machine.getState()).toEqual(INITIAL_LOGIN_STATE)
    expect(transport.cancel).toHaveBeenCalledWith(ATTEMPT)
  })

  it('switching authentication method releases the in-flight attempt', async () => {
    const transport = makeTransport()
    const machine = new OrcaRouterLoginMachine(transport)
    await machine.start()

    machine.switchMethod()

    expect(machine.getState().attemptId).toBeNull()
    expect(transport.cancel).toHaveBeenCalledWith(ATTEMPT)
  })

  it('switching method with nothing in flight is a no-op', () => {
    const transport = makeTransport()
    const machine = new OrcaRouterLoginMachine(transport)

    machine.switchMethod()

    expect(transport.cancel).not.toHaveBeenCalled()
  })

  it('dispose cancels server work on unmount', async () => {
    const transport = makeTransport()
    const machine = new OrcaRouterLoginMachine(transport)
    await machine.start()

    machine.dispose()

    expect(transport.cancel).toHaveBeenCalledWith(ATTEMPT)
  })

  it('a second login releases the first', async () => {
    const transport = makeTransport()
    const machine = new OrcaRouterLoginMachine(transport)
    await machine.start()
    await machine.start()

    expect(transport.cancel).toHaveBeenCalledWith(ATTEMPT)
    expect(machine.getState().attemptId).toBe(ATTEMPT)
  })
})

describe('OrcaRouterLoginMachine — pagehide and the back/forward cache', () => {
  let transport: LoginTransport
  let machine: OrcaRouterLoginMachine

  beforeEach(() => {
    transport = makeTransport()
    machine = new OrcaRouterLoginMachine(transport)
  })

  it('clears busy and hint synchronously, with no await', async () => {
    await machine.start()
    expect(machine.getState().attemptId).toBe(ATTEMPT)

    machine.handlePageHide()

    // Read immediately after the call — the state must already be clear. A
    // deferred clear would leave a bfcache-restored page stuck on "busy"
    // forever, because a restore runs no cleanup.
    expect(machine.getState().busy).toBe(false)
    expect(machine.getState().hint).toBeNull()
    expect(machine.getState().authorizeUrl).toBeNull()
    expect(machine.getState().attemptId).toBeNull()
  })

  it('sends the server cancellation', async () => {
    await machine.start()

    machine.handlePageHide()

    expect(transport.cancel).toHaveBeenCalledWith(ATTEMPT)
  })

  it('allows a second login without remounting the component', async () => {
    await machine.start()
    machine.handlePageHide()

    // The same machine instance continues to be usable — this is the case a
    // restored page hits.
    await machine.start()

    expect(machine.getState().attemptId).toBe(ATTEMPT)
    expect(machine.getState().hint).toBe(CONNECT_HINT)
    expect(machine.getState().busy).toBe(false)
  })
})

describe('OrcaRouterLoginMachine — generation guards', () => {
  it('a late response from a superseded login is dropped', async () => {
    let resolveStart: (value: { attempt_id: string; authorize_url: string }) => void
    const slowStart = new Promise<{ attempt_id: string; authorize_url: string }>((resolve) => {
      resolveStart = resolve
    })
    const transport = makeTransport({ start: vi.fn(() => slowStart) })
    const machine = new OrcaRouterLoginMachine(transport)

    const pending = machine.start()
    // A newer attempt supersedes the one still in flight.
    machine.cancel()
    resolveStart!({ attempt_id: 'stale-attempt', authorize_url: 'https://stale' })
    await pending

    // The stale URL must not appear under the newer (cancelled) generation.
    expect(machine.getState().attemptId).toBeNull()
    expect(machine.getState().authorizeUrl).toBeNull()
  })

  it('a late failure from a superseded login does not clear a newer attempt', async () => {
    const calls: Array<() => void> = []
    const transport = makeTransport({
      start: vi.fn(
        () =>
          new Promise<{ attempt_id: string; authorize_url: string }>((_, reject) => {
            calls.push(() => reject(new Error('stale failure')))
          })
      )
    })
    const machine = new OrcaRouterLoginMachine(transport)

    const first = machine.start()
    const generationAfterFirst = machine.getGeneration()
    // pagehide bumps the generation, exactly as it does in the browser.
    machine.handlePageHide()
    expect(machine.getGeneration()).toBeGreaterThan(generationAfterFirst)

    calls[0]()
    await first

    expect(machine.getState().busy).toBe(false)
    expect(machine.getState().attemptId).toBeNull()
  })

  it('a late completion cannot write state after pagehide', async () => {
    let resolveComplete: (value: unknown) => void
    const transport = makeTransport({
      complete: vi.fn(
        () =>
          new Promise((resolve) => {
            resolveComplete = resolve
          })
      )
    })
    const machine = new OrcaRouterLoginMachine(transport)
    await machine.start()

    const pending = machine.complete('the-code')
    machine.handlePageHide()
    resolveComplete!({ connected: true })
    await pending

    expect(machine.getState()).toEqual(INITIAL_LOGIN_STATE)
  })
})

describe('OrcaRouterLoginMachine — subscribers', () => {
  it('unsubscribe stops notifications', async () => {
    const machine = new OrcaRouterLoginMachine(makeTransport())
    const listener = vi.fn()
    const unsubscribe = machine.subscribe(listener)

    unsubscribe()
    await machine.start()

    expect(listener).not.toHaveBeenCalled()
  })
})
