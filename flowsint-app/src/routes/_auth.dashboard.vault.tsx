import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { KeyService } from '../api/key-service'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
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
import { Loader2, Plus, Trash2, Clock, Shield, Key, Zap, Lock, Sparkles } from 'lucide-react'
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
    queryFn: () => KeyService.get()
  })

  // Create key mutation
  const createKeyMutation = useMutation({
    mutationFn: KeyService.create,
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
    mutationFn: KeyService.deleteById,
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
            <Card className="border-2 border-dashed border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/5">
              <CardContent className="flex flex-col items-center justify-center py-20 px-8">
                <div className="text-center space-y-4 max-w-md">
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                    Your Vault is Empty
                  </h3>
                  <p className="text-muted-foreground text-lg leading-relaxed">
                    Add your first API key to unlock the power of third-party services in your
                    investigations.
                  </p>

                  <div className="flex flex-wrap justify-center gap-3 pt-4 pb-6">
                    <Badge
                      variant="secondary"
                      className="bg-primary/10 text-primary border-primary/20 px-4 py-2"
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Fast Setup
                    </Badge>
                    <Badge
                      variant="secondary"
                      className="bg-emerald-500/10 text-emerald-700 border-emerald-200/40 px-4 py-2"
                    >
                      <Lock className="w-4 h-4 mr-2" />
                      Encrypted
                    </Badge>
                    <Badge
                      variant="secondary"
                      className="bg-violet-500/10 text-violet-700 border-violet-200/40 px-4 py-2"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Secure
                    </Badge>
                  </div>

                  <Button onClick={() => setIsAddDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Key
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="overflow-hidden border bg-gradient-to-br from-background to-muted/20">
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <div className="p-2 bg-primary rounded-lg">
                      <Shield className="w-5 h-5 text-white" strokeWidth={1.9} />
                    </div>
                    API Keys
                  </CardTitle>
                  <Badge variant="secondary" className="px-3 py-1">
                    {keys.length} {keys.length === 1 ? 'key' : 'keys'}
                  </Badge>
                </div>
                <CardDescription className="text-base mt-2">
                  Your encrypted API keys for external services. These keys will be available for
                  your investigations.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b bg-muted/30">
                      <TableHead className="py-4 px-6 text-sm font-semibold w-2/5">
                        <div className="flex items-center gap-2">
                          <Key className="w-4 h-4" />
                          Name
                        </div>
                      </TableHead>
                      <TableHead className="py-4 text-sm font-semibold w-1/3">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          Created
                        </div>
                      </TableHead>
                      <TableHead className="py-4 px-6 text-sm font-semibold text-right w-1/5">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {keys.map((key: KeyType) => (
                      <TableRow
                        key={key.id}
                        className="group hover:bg-gradient-to-r hover:from-primary/5 hover:to-accent/5 transition-all duration-200 border-b border-border/50"
                      >
                        <TableCell className="py-5 px-6">
                          <div className="flex items-center gap-4">
                            <div className="p-2 bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-lg group-hover:scale-110 transition-transform duration-200">
                              <Key className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                {key.name}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Encrypted & Secure
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-5">
                          <div className="flex items-center gap-2 text-sm">
                            <div className="p-1.5 bg-muted rounded-full">
                              <Clock className="w-3 h-3 text-muted-foreground" />
                            </div>
                            <span className="text-muted-foreground">
                              {new Date(key.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right py-5 px-6">
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
