import { fetchWithAuth } from './api'

/**
 * OrcaRouter credential source, mirroring the server's CredentialSource.
 * Which of the two authentication entries produced the stored key.
 */
export type OrcaRouterCredentialSource = 'api_key' | 'oauth_pkce'

export interface OrcaRouterStatus {
  connected: boolean
  source: OrcaRouterCredentialSource | null
  /** Redacted preview produced server-side. The real key never reaches here. */
  masked_key: string | null
  needs_reauth: boolean
  dashboard_url: string
}

export interface OrcaRouterConnectStart {
  attempt_id: string
  authorize_url: string
  expires_in: number
}

/** A model, already filtered server-side for the entry point that asked. */
export interface OrcaRouterModel {
  id: string
  name?: string
  contextLength?: number
  inputModalities?: string[]
  reasoningEfforts?: string[]
}

export interface OrcaRouterCatalog {
  models: OrcaRouterModel[]
  source: string
  /** True when live discovery failed and a verified fallback is standing in. */
  degraded: boolean
  isSeed: boolean
  count: number
  error?: string | null
}

export interface OrcaRouterConnectOptions {
  scope?: 'api' | 'connector'
  login_hint?: string
  workspace_hint?: string
}

/**
 * The credential-acquisition seam on the client, matching the server's.
 *
 * Both entries return the same OrcaRouterStatus once a credential is stored;
 * nothing that consumes a credential branches on which one ran.
 */
export const orcaRouterService = {
  status: (): Promise<OrcaRouterStatus> => fetchWithAuth(`/api/orcarouter`, { method: 'GET' }),

  /** Entry 1 of 2 — paste an existing `sk-orca-…` key. */
  saveApiKey: (apiKey: string): Promise<OrcaRouterStatus> =>
    fetchWithAuth(`/api/orcarouter/api-key`, {
      method: 'POST',
      body: JSON.stringify({ api_key: apiKey })
    }),

  /** Entry 2 of 2 — begin OAuth 2.0 + PKCE and open the consent screen. */
  startConnect: (options: OrcaRouterConnectOptions = {}): Promise<OrcaRouterConnectStart> =>
    fetchWithAuth(`/api/orcarouter/connect`, {
      method: 'POST',
      body: JSON.stringify({
        scope: options.scope ?? 'api',
        login_hint: options.login_hint,
        workspace_hint: options.workspace_hint
      })
    }),

  /** Exchange the code shown on the consent screen. */
  completeConnect: (attemptId: string, code: string): Promise<OrcaRouterStatus> =>
    fetchWithAuth(`/api/orcarouter/connect/complete`, {
      method: 'POST',
      body: JSON.stringify({ attempt_id: attemptId, code })
    }),

  /**
   * Release the server-side login lock.
   *
   * Must be called on every terminal path the browser can observe — cancel,
   * denial, switching method, closing the modal, unmount, and `pagehide`.
   * `keepalive` lets the request survive the page being discarded, which is
   * the difference between the next attempt working and the lock being stuck.
   */
  cancelConnect: (attemptId?: string): Promise<void> =>
    fetchWithAuth(
      `/api/orcarouter/connect/cancel${attemptId ? `?attempt_id=${encodeURIComponent(attemptId)}` : ''}`,
      { method: 'POST', keepalive: true } as RequestInit
    ),

  /** Model catalog for one entry point, capability-filtered server-side. */
  models: (
    entryPoint: string,
    options: { modalities?: string[]; refresh?: boolean } = {}
  ): Promise<OrcaRouterCatalog> => {
    const params = new URLSearchParams({ entry_point: entryPoint })
    if (options.modalities?.length) params.set('modalities', options.modalities.join(','))
    if (options.refresh) params.set('refresh', 'true')
    return fetchWithAuth(`/api/orcarouter/models?${params.toString()}`, { method: 'GET' })
  },

  disconnect: (): Promise<OrcaRouterStatus> =>
    fetchWithAuth(`/api/orcarouter`, { method: 'DELETE' })
}

export const ORCAROUTER_DASHBOARD_URL = 'https://www.orcarouter.ai/console/authorized-apps'
