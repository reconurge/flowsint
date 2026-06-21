import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
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
      toast.success('API key added successfully!')
    },
    onError: (error) => {
      toast.error('Failed to add API key. Please try again.')
      console.error('Error creating key:', error)
    }
  })

  // Delete key mutation
  const deleteKeyMutation = useMutation({
    mutationFn: keyService.deleteById,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.keys.list })
      toast.success('API key deleted successfully!')
    },
    onError: (error) => {
      toast.error('Failed to delete API key. Please try again.')
      console.error('Error deleting key:', error)
    }
  })

  const handleAddKey = () => {
    if (!keyName.trim() || !apiKey.trim()) {
      toast.error('Please enter both a name and an API key')
      return
    }
    createKeyMutation.mutate({ name: keyName.trim(), key: apiKey })
  }

  const handleDeleteKey = async (keyId: string, keyName: string) => {
    const confirmed = await confirm({
      title: 'Delete API Key',
      message: `Are you sure you want to delete the API key "${keyName}"? This action cannot be undone.`
    })

    if (confirmed) {
      deleteKeyMutation.mutate(keyId)
    }
  }

  return (
    <PageLayout
      title="Vault"
      description="Securely manage your API keys for third-party services."
      isLoading={keysLoading}
      loadingComponent={<Loader />}
      error={keysError}
      errorComponent={
        <ErrorState
          title="Couldn't load keys"
          description="Something went wrong while fetching data. Please try again."
          error={keysError}
          onRetry={() => refetch()}
        />
      }
      actions={
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add API Key
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add API Key</DialogTitle>
              <DialogDescription>
                Add a new API key with a custom name. Your keys are encrypted and stored securely.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="keyName">Key Name</Label>
                <Input
                  id="keyName"
                  placeholder="e.g., OpenAI, GitHub, Shodan..."
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  placeholder="Enter your API key"
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
                Cancel
              </Button>
              <Button
                onClick={handleAddKey}
                disabled={createKeyMutation.isPending || !keyName.trim() || !apiKey.trim()}
              >
                {createKeyMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Add Key
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
              <h3 className="text-xl font-bold text-foreground">No keys yet</h3>
              <p className="text-muted-foreground max-w-xs leading-relaxed">
                Add your first API key to use third-party services in your investigations.
              </p>
            </div>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add your first key
            </Button>
          </div>
        ) : (
          <Card className="overflow-hidden">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">API Keys</CardTitle>
                <span className="text-xs text-muted-foreground">
                  {keys.length} {keys.length === 1 ? 'key' : 'keys'}
                </span>
              </div>
              <CardDescription>
                Your encrypted API keys for external services. These keys will be available for your
                investigations.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-b bg-muted/20">
                    <TableHead className="py-3 px-6 w-2/5">Name</TableHead>
                    <TableHead className="py-3 w-1/3">Added</TableHead>
                    <TableHead className="py-3 px-6 text-right w-1/5">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {keys.map((key: KeyType) => (
                    <TableRow key={key.id} className="hover:bg-muted/30 border-b border-border/50">
                      <TableCell className="py-4 px-6 font-medium">{key.name}</TableCell>
                      <TableCell className="py-4 text-sm text-muted-foreground">
                        {new Date(key.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
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
