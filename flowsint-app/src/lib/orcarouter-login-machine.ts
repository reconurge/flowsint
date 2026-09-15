/**
 * Login lifecycle state machine for the OrcaRouter "Connect" flow.
 *
 * Kept free of React so the parts that are easy to get subtly wrong are
 * directly testable in the repository's node test environment, which has no
 * DOM and no component-testing library.
 *
 * The rules it enforces:
 *
 *  - a monotonically increasing generation. Every async response checks it
 *    before touching state, so a late success or failure from login N can never
 *    land under login N+1.
 *  - every terminal path releases the lock: success, denial, exchange error,
 *    timeout, explicit cancel, switching method, unmount, and `pagehide`.
 *  - `pagehide` clears busy/hint **synchronously** and fires the server-side
 *    cancellation with `keepalive`. A browser may restore the page from the
 *    back/forward cache, and a restored page runs no cleanup — relying on an
 *    invalidated request's `finally` would leave it permanently busy.
 */

export interface LoginTransport {
  start: () => Promise<{ attempt_id: string; authorize_url: string }>
  complete: (attemptId: string, code: string) => Promise<unknown>
  cancel: (attemptId?: string) => Promise<unknown>
}

export interface LoginState {
  /** A login is in progress and the UI should be busy. */
  busy: boolean
  /** The attempt the UI is currently driving, if any. */
  attemptId: string | null
  /** The authorize URL to show for browsers that did not open automatically. */
  authorizeUrl: string | null
  /** Instruction shown to the user while an attempt is open. */
  hint: string | null
}

export const INITIAL_LOGIN_STATE: LoginState = {
  busy: false,
  attemptId: null,
  authorizeUrl: null,
  hint: null
}

export const CONNECT_HINT = 'Approve the request in the opened tab, then paste the code below.'

export type StateListener = (state: LoginState) => void

export class OrcaRouterLoginMachine {
  private generation = 0
  private state: LoginState = { ...INITIAL_LOGIN_STATE }
  private listeners = new Set<StateListener>()
  private cancelOnPageHide: boolean

  constructor(
    private readonly transport: LoginTransport,
    options: { cancelOnPageHide?: boolean } = {}
  ) {
    this.cancelOnPageHide = options.cancelOnPageHide ?? true
  }

  getState(): LoginState {
    return this.state
  }

  /** The current generation. Exposed so callers can assert on races. */
  getGeneration(): number {
    return this.generation
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private set(patch: Partial<LoginState>): void {
    this.state = { ...this.state, ...patch }
    for (const listener of this.listeners) listener(this.state)
  }

  /**
   * Release the lock and drop any in-flight attempt.
   *
   * Bumping the generation first is what makes this safe to call from a
   * response handler: the request that is about to resolve sees a stale
   * generation and refuses to write.
   */
  private release(patch: Partial<LoginState>, releaseServer = true): void {
    this.generation += 1
    const current = this.state.attemptId
    this.set({ busy: false, attemptId: null, authorizeUrl: null, hint: null, ...patch })
    if (current && releaseServer) {
      void Promise.resolve(this.transport.cancel(current)).catch(() => undefined)
    }
  }

  async start(): Promise<void> {
    this.release({})
    const generation = this.generation
    this.set({ busy: true, hint: null })
    try {
      const started = await this.transport.start()
      // A newer attempt (or a pagehide) superseded this one while it was in
      // flight: drop the response rather than resurrecting a dead attempt.
      if (generation !== this.generation) return
      this.set({
        attemptId: started.attempt_id,
        authorizeUrl: started.authorize_url,
        hint: CONNECT_HINT,
        busy: false
      })
    } catch (error) {
      if (generation !== this.generation) return
      this.set({ busy: false, hint: null })
      throw error
    }
  }

  async complete(code: string): Promise<void> {
    const attemptId = this.state.attemptId
    if (!attemptId) throw new Error('No authorization is in progress.')
    if (!code.trim()) throw new Error('Paste the code shown on the consent screen.')

    const generation = this.generation
    this.set({ busy: true })
    try {
      await this.transport.complete(attemptId, code.trim())
      if (generation !== this.generation) return
      this.generation += 1
      this.set({ ...INITIAL_LOGIN_STATE })
    } catch (error) {
      if (generation !== this.generation) return
      // Keep the attempt open so the user can correct a mistyped code, but
      // stop showing the busy state.
      this.set({ busy: false, hint: null })
      throw error
    }
  }

  cancel(): void {
    this.release({})
  }

  /**
   * Switching authentication method is a terminal path for the current one.
   * Without this the server keeps its "login in progress" lock and the next
   * attempt is refused.
   */
  switchMethod(): void {
    if (this.state.attemptId || this.state.busy) this.release({})
  }

  /**
   * `pagehide` handler. Clears local state synchronously, then asks the server
   * to cancel — with `keepalive` so the request survives the page going away.
   */
  handlePageHide(): void {
    const current = this.state.attemptId
    this.generation += 1
    // Synchronous, promise-free clear. This is the whole point: a bfcache
    // restore re-runs no cleanup, so anything deferred here would leave the
    // restored page stuck.
    this.set({ ...INITIAL_LOGIN_STATE })
    if (current && this.cancelOnPageHide) {
      void Promise.resolve(this.transport.cancel(current)).catch(() => undefined)
    }
  }

  /** Unmount: release server work, without writing further state. */
  dispose(): void {
    const current = this.state.attemptId
    this.generation += 1
    this.listeners.clear()
    if (current) {
      void Promise.resolve(this.transport.cancel(current)).catch(() => undefined)
    }
  }
}
