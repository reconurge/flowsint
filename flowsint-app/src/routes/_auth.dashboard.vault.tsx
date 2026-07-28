import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { ru, enUS } from 'date-fns/locale'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { keyService } from '../api/key-service'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '../components/ui/dialog'
import { Label } from '../components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../components/ui/table'
import { Loader2, Plus, Trash2, KeyRound } from 'lucide-react'
import { toast } from 'sonner'
import { useConfirm } from '../components/use-confirm-dialog'
import Loader from '@/components/loader'
import { type Key as KeyType } from '@/types/key'
import { queryKeys } from '@/api/query-keys'
import ErrorState from '@/components/shared/error-state'
import { PageLayout } from '@/components/layout/page-layout'
export const Route = createFileRoute('/_auth/dashboard/vault')({
  component: VaultPage
})

function VaultPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'ru' ? ru : enUS

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [keyName, setKeyName] = useState('')
  const [apiKey, setApiKey] = useState('')
  const queryClient = useQueryClient()
  const { confirm } = useConfirm()

  // Fetch keys
  const {
    data: keys = [],
    isLoading: keysLoading,
    error: keysError,
    refetch
  } = useQuery<KeyType[]>({
    queryKey: queryKeys.keys.list,
    queryFn: () => keyService.get()
  })

  // Create key mutation
  const createKeyMutation = useMutation({
    mutationFn: keyService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.keys.list })
      setIsAddDialogOpen(false)
      setKeyName('')
      setApiKey('')
      toast.success(t('vault.toast.added'))
    },
    onError: (error) => {
      toast.error(t('vault.toast.addFailed'))
      console.error('Error creating key:', error)
    }
  })

  // Delete key mutation
  const deleteKeyMutation = useMutation({
    mutationFn: keyService.deleteById,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.keys.list })
      toast.success(t('vault.toast.deleted'))
    },
    onError: (error) => {
      toast.error(t('vault.toast.deleteFailed'))
      console.error('Error deleting key:', error)
    }
  })

  const handleAddKey = () => {
    if (!keyName.trim() || !apiKey.trim()) {
      toast.error(t('vault.toast.enterBoth'))
      return
    }
    createKeyMutation.mutate({ name: keyName.trim(), key: apiKey })
  }

  const handleDeleteKey = async (keyId: string, keyName: string) => {
    const confirmed = await confirm({
      title: t('vault.deleteConfirm.title'),
      message: t('vault.deleteConfirm.message', { name: keyName })
    })

    if (confirmed) {
      deleteKeyMutation.mutate(keyId)
    }
  }

  return (
    <PageLayout
      title={t('vault.title')}
      description={t('vault.description')}
      isLoading={keysLoading}
      loadingComponent={<Loader />}
      error={keysError}
      errorComponent={
        <ErrorState
          title={t('vault.errorTitle')}
          description={t('common.errorDesc')}
          error={keysError}
          onRetry={() => refetch()}
        />
      }
      actions={
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              {t('vault.addKeyBtn')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{t('vault.addKeyBtn')}</DialogTitle>
              <DialogDescription>
                {t('vault.addKeyDesc')}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="keyName">{t('vault.keyName')}</Label>
                <Input
                  id="keyName"
                  placeholder={t('vault.keyNamePlaceholder')}
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="apiKey">{t('vault.apiKey')}</Label>
                <Input
                  id="apiKey"
                  type="password"
                  placeholder={t('vault.apiKeyPlaceholder')}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
                disabled={createKeyMutation.isPending}
              >
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handleAddKey}
                disabled={createKeyMutation.isPending || !keyName.trim() || !apiKey.trim()}
              >
                {createKeyMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {t('vault.submitBtn')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="w-full">
        {keys.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-5">
            <KeyRound className="w-12 h-12 text-muted-foreground/40" strokeWidth={1.5} />
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-foreground">{t('vault.noKeys')}</h3>
              <p className="text-muted-foreground max-w-xs leading-relaxed">
                {t('vault.noKeysDesc')}
              </p>
            </div>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t('vault.addFirstKey')}
            </Button>
          </div>
        ) : (
          <Card className="overflow-hidden">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">{t('vault.tableTitle')}</CardTitle>
                <span className="text-xs text-muted-foreground">
                  {t('vault.keysCount', { count: keys.length })}
                </span>
              </div>
              <CardDescription>
                {t('vault.tableDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-b bg-muted/20">
                    <TableHead className="py-3 px-6 w-2/5">{t('vault.tableName')}</TableHead>
                    <TableHead className="py-3 w-1/3">{t('vault.tableAdded')}</TableHead>
                    <TableHead className="py-3 px-6 text-right w-1/5">{t('vault.tableActions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {keys.map((key: KeyType) => (
                    <TableRow key={key.id} className="hover:bg-muted/30 border-b border-border/50">
                      <TableCell className="py-4 px-6 font-medium">{key.name}</TableCell>
                      <TableCell className="py-4 text-sm text-muted-foreground">
                        {format(new Date(key.created_at), 'PPP', { locale })}
                      </TableCell>
                      <TableCell className="text-right py-4 px-6">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteKey(key.id, key.name)}
                          disabled={deleteKeyMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </PageLayout>
  )
}

export default VaultPage
