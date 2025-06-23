import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ThirdPartyKeysService } from '../api/third-party-keys-service'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog'
import { Label } from '../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { Loader2, Plus, ExternalLink, Trash2, CheckCircle, XCircle, Clock, Shield } from 'lucide-react'
import { toast } from 'sonner'
import { useConfirm } from '../components/use-confirm-dialog'

export const Route = createFileRoute('/_auth/dashboard/vault')({
    component: VaultPage,
})

interface ServiceInfo {
    service: string
    variable: string
    url: string
    active: boolean
}
function VaultPage() {
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [selectedService, setSelectedService] = useState('')
    const [apiKey, setApiKey] = useState('')
    const queryClient = useQueryClient()
    const { confirm } = useConfirm()

    // Fetch services and keys
    const { data: services = [], isLoading: servicesLoading } = useQuery({
        queryKey: ['third-party-services'],
        queryFn: () => ThirdPartyKeysService.getServices(),
    })

    const { data: keys = [], isLoading: keysLoading } = useQuery({
        queryKey: ['third-party-keys'],
        queryFn: () => ThirdPartyKeysService.get(),
    })

    // Create key mutation
    const createKeyMutation = useMutation({
        mutationFn: ThirdPartyKeysService.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['third-party-keys'] })
            setIsAddDialogOpen(false)
            setSelectedService('')
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
        mutationFn: ThirdPartyKeysService.deleteById,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['third-party-keys'] })
            toast.success('API key deleted successfully!')
        },
        onError: (error) => {
            toast.error('Failed to delete API key. Please try again.')
            console.error('Error deleting key:', error)
        }
    })

    const handleAddKey = () => {
        if (!selectedService || !apiKey.trim()) {
            toast.error('Please select a service and enter an API key')
            return
        }
        createKeyMutation.mutate({ service: selectedService, key: apiKey })
    }

    const handleDeleteKey = async (keyId: string, serviceName: string) => {
        const confirmed = await confirm({
            title: 'Delete API Key',
            message: `Are you sure you want to delete the API key for ${serviceName}? This action cannot be undone.`
        })
        
        if (confirmed) {
            deleteKeyMutation.mutate(keyId)
        }
    }

    const getKeyForService = (serviceName: string) => {
        return keys.find(key => key.service === serviceName)
    }

    const getStatusIcon = (service: ServiceInfo) => {
        const key = getKeyForService(service.service)
        if (key) {
            return <CheckCircle className="w-5 h-5 text-green-500" />
        }
        return <XCircle className="w-5 h-5 text-red-500" />
    }

    const getStatusBadge = (service: ServiceInfo) => {
        const key = getKeyForService(service.service)
        if (key) {
            return <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Configured</Badge>
        }
        return <Badge variant="secondary" className="bg-muted text-muted-foreground">Not configured</Badge>
    }

    if (servicesLoading || keysLoading) {
        return (
            <div className="h-full w-full px-12 py-12 bg-background overflow-auto">
                <div className='max-w-7xl mx-auto flex flex-col gap-12 items-center justify-start'>
                    <div className='w-full'>
                        <h1 className="font-semibold text-2xl">Vault</h1>
                        <p className="opacity-60 mt-3">Here are the keys used to query third party services.</p>
                    </div>
                    <div className="w-full flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="h-full w-full px-12 py-12 bg-background overflow-auto">
            <div className='max-w-7xl mx-auto flex flex-col gap-12 items-center justify-start'>
                <div className='w-full flex justify-between items-start'>
                    <div>
                        <h1 className="font-semibold text-2xl">Vault</h1>
                        <p className="opacity-60 mt-3">Here are the keys used to query third party services.</p>
                    </div>
                    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="flex items-center gap-2">
                                <Plus className="w-4 h-4" />
                                Add API Key
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Add API Key</DialogTitle>
                                <DialogDescription>
                                    Add a new API key for a third-party service. Your keys are encrypted and stored securely.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="service">Service</Label>
                                    <Select value={selectedService} onValueChange={setSelectedService}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a service" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {services.filter(s => s.active).map((service) => (
                                                <SelectItem key={service.service} value={service.service}>
                                                    {service.service}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
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
                                    disabled={createKeyMutation.isPending || !selectedService || !apiKey.trim()}
                                >
                                    {createKeyMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    Add Key
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="w-full">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="w-5 h-5" />
                                Third-Party Services
                            </CardTitle>
                            <CardDescription>
                                Manage your API keys for external services. Configured services will be available for your investigations.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-12"></TableHead>
                                            <TableHead>Service</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Added</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {services.map((service) => {
                                            const key = getKeyForService(service.service)
                                            return (
                                                <TableRow key={service.service} className="hover:bg-muted/50">
                                                    <TableCell className="w-12">
                                                        {getStatusIcon(service)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col gap-1">
                                                            <div className="font-medium">{service.service}</div>
                                                            {!service.active && (
                                                                <Badge variant="outline" className="w-fit text-orange-600 border-orange-200 dark:text-orange-400 dark:border-orange-800 text-xs">
                                                                    Coming Soon
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {getStatusBadge(service)}
                                                    </TableCell>
                                                    <TableCell>
                                                        {key ? (
                                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                                <Clock className="w-4 h-4" />
                                                                {new Date(key.created_at).toLocaleDateString()}
                                                            </div>
                                                        ) : (
                                                            <span className="text-sm text-muted-foreground">—</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => window.open(service.url, '_blank')}
                                                                className="flex items-center gap-1 h-8 px-2"
                                                            >
                                                                <ExternalLink className="w-4 h-4" />
                                                                <span className="hidden sm:inline">Visit</span>
                                                            </Button>
                                                            {key ? (
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="sm" 
                                                                    className="text-destructive hover:text-destructive/80 h-8 px-2"
                                                                    onClick={() => handleDeleteKey(key.id, service.service)}
                                                                    disabled={deleteKeyMutation.isPending}
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            ) : (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        setSelectedService(service.service)
                                                                        setIsAddDialogOpen(true)
                                                                    }}
                                                                    disabled={!service.active}
                                                                    className="flex items-center gap-1 h-8 px-2"
                                                                >
                                                                    <Plus className="w-4 h-4" />
                                                                    <span className="hidden sm:inline">Add Key</span>
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}

export default VaultPage