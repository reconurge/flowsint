import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ExternalLink, KeyRound, Loader2, LogIn, ShieldCheck, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ORCAROUTER_DASHBOARD_URL, orcaRouterService } from '@/api/orcarouter-service'
import { OrcaRouterModelSelector } from './model-selector'
import {
  INITIAL_LOGIN_STATE,
  OrcaRouterLoginMachine,
  type LoginState
} from '@/lib/orcarouter-login-machine'

/**
 * OrcaRouter credential panel.
 *
 * Presents the two authentication entries as two explicit, independently usable
 * choices — never one button that sometimes asks for a key and sometimes opens a
 * browser. Both end up storing the same kind of credential, and everything below
 * this component is indifferent to which one was used.
 *
 *  - "OrcaRouter - API"  paste an existing `sk-orca-…` key
 *  - "OrcaRouter - Auth" OAuth 2.0 + PKCE (out-of-band code)
 *
 * Login-lifecycle rules implemented here, all of which are easy to get subtly
 * wrong and impossible to notice in a happy-path test:
 *
 *  - every async response carries the generation it belongs to, and a response
 *    from an older generation is dropped rather than allowed to overwrite a
 *    newer login;
 *  - every terminal path — success, denial, exchange error, timeout, explicit
 *    cancel, switching method, closing the modal, unmount, and `pagehide` —
 *    releases both the server-side lock and the local busy state;
 *  - `pagehide` is handled specially: the browser may put the page into the
 *    back/forward cache, so the generation is invalidated and busy/hint are
 *    cleared *synchronously* in the handler, then the server cancellation is
 *    sent with `keepalive`. Relying on the invalidated request's `finally`
 *    block would leave a restored page permanently busy.
 */

export interface OrcaRouterCredentialPanelProps {
  /** Which AI entry point this panel configures, for the model selector. */
  entryPoint: string
  requiredModalities?: string[]
  model?: string
  onModelChange?: (modelId: string) => void
  showModelSelector?: boolean
}

type AuthMethod = 'api_key' | 'oauth'

export function OrcaRouterCredentialPanel({
  entryPoint,
  requiredModalities = [],
  model,
  onModelChange,
  showModelSelector = true
}: OrcaRouterCredentialPanelProps) {
  const queryClient = useQueryClient()

  const [method, setMethod] = useState<AuthMethod>('api_key')
  const [apiKey, setApiKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [code, setCode] = useState('')
  const [login, setLogin] = useState<LoginState>(INITIAL_LOGIN_STATE)

  // All the generation tracking and terminal-path handling lives in the
  // machine, so this component only renders what it reports.
  const machine = useMemo(
    () =>
      new OrcaRouterLoginMachine({
        start: () => orcaRouterService.startConnect({ scope: 'api' }),
        complete: (attemptId, submitted) => orcaRouterService.completeConnect(attemptId, submitted),
        cancel: (attemptId) => orcaRouterService.cancelConnect(attemptId)
      }),
    []
  )

  const { data: status, isLoading } = useQuery({
    queryKey: ['orcarouter', 'status'],
    queryFn: orcaRouterService.status,
    refetchOnMount: true
  })

  useEffect(() => machine.subscribe(setLogin), [machine])

  useEffect(() => {
    // `pagehide` is handled by the machine: it clears local state synchronously
    // and sends the server cancellation with keepalive, so a back/forward-cache
    // restore is not left permanently busy.
    const onPageHide = () => machine.handlePageHide()
    window.addEventListener('pagehide', onPageHide)
    return () => {
      window.removeEventListener('pagehide', onPageHide)
      machine.dispose()
    }
  }, [machine])

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['orcarouter'] })
    queryClient.invalidateQueries({ queryKey: ['is_chat_active'] })
  }, [queryClient])

  const saveApiKey = async () => {
    if (!apiKey.trim()) {
      toast.error('Enter an OrcaRouter API key')
      return
    }
    setSaving(true)
    try {
      await orcaRouterService.saveApiKey(apiKey.trim())
      // Only clear the field once the key is safely stored.
      setApiKey('')
      invalidate()
      toast.success('OrcaRouter API key saved')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save the key')
    } finally {
      setSaving(false)
    }
  }

  const startLogin = async () => {
    try {
      await machine.start()
      const url = machine.getState().authorizeUrl
      if (url) window.open(url, '_blank', 'noopener,noreferrer')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not start the authorization')
    }
  }

  const completeLogin = async () => {
    try {
      await machine.complete(code)
      setCode('')
      invalidate()
      toast.success('Connected to OrcaRouter')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not complete the authorization')
    }
  }

  const cancelLogin = () => {
    machine.cancel()
    setCode('')
    toast.message('Authorization cancelled')
  }

  const switchMethod = (next: AuthMethod) => {
    if (next === method) return
    // Switching authentication method is a terminal path for the old one.
    machine.switchMethod()
    setMethod(next)
  }

  const disconnect = async () => {
    machine.cancel()
    try {
      await orcaRouterService.disconnect()
      invalidate()
      toast.success('Disconnected from OrcaRouter')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not disconnect')
    }
  }

  return (
    <Card data-testid="orcarouter-panel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <img
            src="https://www.orcarouter.ai/orca-logo-classic.png"
            alt=""
            aria-hidden="true"
            className="h-5 w-5 object-contain"
          />
          OrcaRouter
        </CardTitle>
        <CardDescription>
          An OpenAI-compatible AI gateway with adaptive routing across vendors. Choose how to
          connect — both options store the same kind of key, billed to your own OrcaRouter account.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking connection…
          </div>
        ) : (
          <>
            {status?.connected ? (
              <div className="flex flex-col gap-3 rounded-md border border-border p-3">
                <div className="flex items-center gap-2 text-sm">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span className="font-medium">Connected</span>
                  <span className="text-muted-foreground">
                    via {status.source === 'oauth_pkce' ? 'OrcaRouter - Auth' : 'OrcaRouter - API'}
                  </span>
                </div>
                {status.masked_key ? (
                  <code
                    className="text-xs text-muted-foreground"
                    data-testid="orcarouter-masked-key"
                  >
                    {status.masked_key}
                  </code>
                ) : null}
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={disconnect}>
                    Disconnect
                  </Button>
                  <a
                    href={status.dashboard_url || ORCAROUTER_DASHBOARD_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground underline"
                  >
                    Manage keys
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            ) : null}

            {status?.needs_reauth ? (
              <p className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                Your OrcaRouter credential was revoked or rejected. Reconnect below — the old key is
                kept until a new one succeeds.
              </p>
            ) : null}

            {/* Both entries stay available even while connected. A key can be
                revoked from the console at any time, and the user must be able
                to paste a replacement or re-authorize without first
                disconnecting — which would otherwise leave them with no
                credential at all if the new attempt failed. */}
            <div
              className="grid grid-cols-2 gap-2"
              role="tablist"
              aria-label="OrcaRouter authentication method"
            >
              <Button
                type="button"
                role="tab"
                aria-selected={method === 'api_key'}
                variant={method === 'api_key' ? 'default' : 'outline'}
                size="sm"
                onClick={() => switchMethod('api_key')}
                data-testid="orcarouter-method-api-key"
              >
                <KeyRound className="mr-1 h-3 w-3" />
                OrcaRouter - API
              </Button>
              <Button
                type="button"
                role="tab"
                aria-selected={method === 'oauth'}
                variant={method === 'oauth' ? 'default' : 'outline'}
                size="sm"
                onClick={() => switchMethod('oauth')}
                data-testid="orcarouter-method-oauth"
              >
                <LogIn className="mr-1 h-3 w-3" />
                OrcaRouter - Auth
              </Button>
            </div>

            {method === 'api_key' ? (
              <div className="flex flex-col gap-2">
                <Label htmlFor="orcarouter-api-key">API key</Label>
                <Input
                  id="orcarouter-api-key"
                  type="password"
                  autoComplete="off"
                  placeholder="sk-orca-…"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  data-testid="orcarouter-api-key-input"
                />
                <p className="text-xs text-muted-foreground">
                  Stored encrypted in your vault as <code>ORCAROUTER_API_KEY</code>. Create one at{' '}
                  <a
                    href={ORCAROUTER_DASHBOARD_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    the OrcaRouter console
                  </a>
                  .
                </p>
                <Button
                  size="sm"
                  onClick={saveApiKey}
                  disabled={saving || !apiKey.trim()}
                  data-testid="orcarouter-api-key-save"
                >
                  {saving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                  Save key
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {!login.attemptId ? (
                  <>
                    <p className="text-xs text-muted-foreground">
                      Authorize in your browser and paste the code OrcaRouter shows you. No client
                      secret and no callback address needed.
                    </p>
                    <Button
                      size="sm"
                      onClick={startLogin}
                      disabled={login.busy}
                      data-testid="orcarouter-connect-start"
                    >
                      {login.busy ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : (
                        <LogIn className="mr-1 h-3 w-3" />
                      )}
                      Connect with OrcaRouter
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground" data-testid="orcarouter-hint">
                      {login.hint}
                    </p>
                    {login.authorizeUrl ? (
                      <a
                        href={login.authorizeUrl ?? '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate text-xs underline"
                        data-testid="orcarouter-authorize-url"
                      >
                        {login.authorizeUrl}
                      </a>
                    ) : null}
                    <Label htmlFor="orcarouter-code">Authorization code</Label>
                    <Input
                      id="orcarouter-code"
                      autoComplete="off"
                      placeholder="Paste the code"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      data-testid="orcarouter-code-input"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={completeLogin}
                        disabled={login.busy || !code.trim()}
                        data-testid="orcarouter-connect-complete"
                      >
                        {login.busy ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                        Finish setup
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={cancelLogin}
                        data-testid="orcarouter-connect-cancel"
                      >
                        <X className="mr-1 h-3 w-3" />
                        Cancel
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}

        {showModelSelector ? (
          <div className="flex flex-col gap-2 border-t border-border pt-4">
            <Label>Model</Label>
            <OrcaRouterModelSelector
              entryPoint={entryPoint}
              requiredModalities={requiredModalities}
              value={model}
              onChange={onModelChange ?? (() => undefined)}
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

export default OrcaRouterCredentialPanel
