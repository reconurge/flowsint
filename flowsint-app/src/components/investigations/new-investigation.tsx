import { useState, type ReactNode } from 'react'
import { useForm, type UseFormReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { investigationService } from '@/api/investigation-service'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/api/query-keys'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import * as z from 'zod'

// Schema de validation Zod
const investigationSchema = z.object({
  name: z
    .string()
    .min(1, 'Investigation name is required')
    .min(3, 'Investigation name must be at least 3 characters')
    .max(100, 'Investigation name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional()
})

type InvestigationFormData = z.infer<typeof investigationSchema>

// Hoisted to module scope — defining this inside NewInvestigation's render
// made it a new component type every render, which unmounts/remounts the
// whole form (losing focus, resetting any in-progress typing) any time the
// parent re-renders while the dialog is open.
function InvestigationForm({
  form,
  isSubmitting,
  onSubmit,
  onCancel
}: {
  form: UseFormReturn<InvestigationFormData>
  isSubmitting: boolean
  onSubmit: (data: InvestigationFormData) => void
  onCancel: () => void
}) {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-4 py-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Investigation name</FormLabel>
                <FormControl>
                  <Input
                    required
                    placeholder="Fraud suspicion"
                    disabled={isSubmitting}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Investigation into a phishing campaign via LinkedIn."
                    disabled={isSubmitting}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Investigation'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  )
}

interface NewInvestigationProps {
  children: ReactNode
  noDropDown?: boolean
}

export default function NewInvestigation({ children, noDropDown = false }: NewInvestigationProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const queryClient = useQueryClient()

  const form = useForm<InvestigationFormData>({
    resolver: zodResolver(investigationSchema),
    defaultValues: {
      name: '',
      description: ''
    }
  })

  const {
    formState: { isSubmitting },
    reset
  } = form

  // Create investigation mutation
  const createInvestigationMutation = useMutation({
    mutationFn: investigationService.create,
    onSuccess: (result) => {
      if ('id' in result && result.id) {
        toast.success('New investigation created.')
        router.navigate({ to: `/dashboard/investigations/${result.id}` })
        // Invalidate investigations list
        queryClient.invalidateQueries({
          queryKey: queryKeys.investigations.list
        })
      } else {
        toast.error(('error' in result && result.error) || 'Failed to create investigation')
      }
    },
    onError: (error) => {
      toast.error(error.message)
    }
  })

  const onSubmit = async (data: InvestigationFormData) => {
    try {
      await createInvestigationMutation.mutateAsync(JSON.stringify(data))
    } catch (error) {
      console.error('Error creating investigation:', error)
    }
  }

  const handleClose = () => {
    setOpen(false)
    reset() // Reset du formulaire avec React Hook Form
  }

  if (noDropDown) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <span role="button">{children}</span>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>New investigation</DialogTitle>
            <DialogDescription>Create a new blank investigation.</DialogDescription>
          </DialogHeader>
          <InvestigationForm
            form={form}
            isSubmitting={isSubmitting}
            onSubmit={onSubmit}
            onCancel={handleClose}
          />
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setOpen(true)}>
            New investigation
            <span className="ml-auto text-xs text-muted-foreground">⌘ E</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>New investigation</DialogTitle>
            <DialogDescription>Create a new blank investigation.</DialogDescription>
          </DialogHeader>
          <InvestigationForm
            form={form}
            isSubmitting={isSubmitting}
            onSubmit={onSubmit}
            onCancel={handleClose}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
