import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Tests for the OrcaRouter API client.
 *
 * `fetchWithAuth` is mocked so no request leaves the process. The important
 * assertions are about which URL and HTTP method each authentication entry
 * uses, and that `cancel` is sent with `keepalive` — the difference between the
 * next login attempt working after a pagehide and the server lock being stuck.
 */

type Call = [string, { method?: string; body?: string; keepalive?: boolean }]

const fetchWithAuth = vi.fn(async (..._args: unknown[]): Promise<unknown> => ({}))

vi.mock('./api', () => ({ fetchWithAuth: (...args: unknown[]) => fetchWithAuth(...args) }))

import { orcaRouterService, ORCAROUTER_DASHBOARD_URL } from './orcarouter-service'

const lastCall = (): Call =>
  fetchWithAuth.mock.calls[fetchWithAuth.mock.calls.length - 1] as unknown as Call

beforeEach(() => {
  fetchWithAuth.mockClear()
})

describe('orcaRouterService — API-key entry', () => {
  it('posts the key to the api-key route', async () => {
    await orcaRouterService.saveApiKey('sk-orca-fake')

    const [endpoint, options] = lastCall()
    expect(endpoint).toBe('/api/orcarouter/api-key')
    expect(options.method).toBe('POST')
    expect(JSON.parse(options.body!)).toEqual({ api_key: 'sk-orca-fake' })
  })

  it('never puts the key in the URL', async () => {
    await orcaRouterService.saveApiKey('sk-orca-fake')

    const [endpoint] = lastCall()
    expect(endpoint).not.toContain('sk-orca-fake')
  })
})

describe('orcaRouterService — PKCE entry', () => {
  it('starts a connect attempt with the documented scope', async () => {
    await orcaRouterService.startConnect()

    const [endpoint, options] = lastCall()
    expect(endpoint).toBe('/api/orcarouter/connect')
    expect(options.method).toBe('POST')
    expect(JSON.parse(options.body!).scope).toBe('api')
  })

  it('reads only the server-returned authorize URL and attempt id', async () => {
    fetchWithAuth.mockResolvedValueOnce({
      attempt_id: 'a1',
      authorize_url: 'https://www.orcarouter.ai/auth?callback_url=oob',
      expires_in: 300
    })

    const started = await orcaRouterService.startConnect()

    expect(started.attempt_id).toBe('a1')
    expect(started.authorize_url).toContain('www.orcarouter.ai/auth')
  })

  it('posts the code and attempt id to the complete route', async () => {
    await orcaRouterService.completeConnect('a1', 'the-code')

    const [endpoint, options] = lastCall()
    expect(endpoint).toBe('/api/orcarouter/connect/complete')
    expect(JSON.parse(options.body!)).toEqual({ attempt_id: 'a1', code: 'the-code' })
  })

  it('sends the cancellation with keepalive so it survives pagehide', async () => {
    await orcaRouterService.cancelConnect('a1')

    const [endpoint, options] = lastCall()
    expect(endpoint).toBe('/api/orcarouter/connect/cancel?attempt_id=a1')
    expect(options.method).toBe('POST')
    // Without keepalive the browser can drop the request as the page goes away,
    // leaving the server "login in progress" lock held.
    expect(options.keepalive).toBe(true)
  })

  it('can cancel every attempt for the user when no id is given', async () => {
    await orcaRouterService.cancelConnect()

    const [endpoint] = lastCall()
    expect(endpoint).toBe('/api/orcarouter/connect/cancel')
  })
})

describe('orcaRouterService — status and disconnect', () => {
  it('reads status from the provider root', async () => {
    await orcaRouterService.status()

    const [endpoint, options] = lastCall()
    expect(endpoint).toBe('/api/orcarouter')
    expect(options.method).toBe('GET')
  })

  it('disconnects with DELETE on the provider root', async () => {
    await orcaRouterService.disconnect()

    const [endpoint, options] = lastCall()
    expect(endpoint).toBe('/api/orcarouter')
    expect(options.method).toBe('DELETE')
  })

  it('exposes a real dashboard URL for key management', () => {
    expect(ORCAROUTER_DASHBOARD_URL).toBe('https://www.orcarouter.ai/console/authorized-apps')
  })
})

describe('orcaRouterService — model catalog', () => {
  it('requests the catalog for a named entry point', async () => {
    await orcaRouterService.models('chat')

    const [endpoint] = lastCall()
    expect(endpoint).toContain('/api/orcarouter/models?')
    expect(endpoint).toContain('entry_point=chat')
  })

  it('passes required modalities so the server can filter fail-closed', async () => {
    await orcaRouterService.models('chat', { modalities: ['image'] })

    const [endpoint] = lastCall()
    expect(endpoint).toContain('modalities=image')
  })

  it('omits the modalities parameter when nothing non-text is uploaded', async () => {
    await orcaRouterService.models('chat', { modalities: [] })

    const [endpoint] = lastCall()
    expect(endpoint).not.toContain('modalities=')
  })

  it('can force a refresh of the catalog', async () => {
    await orcaRouterService.models('chat', { refresh: true })

    const [endpoint] = lastCall()
    expect(endpoint).toContain('refresh=true')
  })
})
