import { useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { useRouter, useParams } from '@tanstack/react-router'
import { toast } from 'sonner'
import { sketchService } from '@/api/sketch-service'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useTranslation } from 'react-i18next'

interface FormValues {
  title: string
  description?: string
}

interface NewSketchProps {
  children: ReactNode
}

export default function NewSketch({ children }: NewSketchProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const { investigationId, id: sketchId } = useParams({ strict: false })
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm<FormValues>()

  // Create sketch mutation
  const createSketchMutation = useMutation({
    mutationFn: sketchService.create,
    onSuccess: (result) => {
      if (result.id) {
        toast.success(t('newSketch.toast.success'))
        router.navigate({
          to: `/dashboard/investigations/${investigationId}/graph/${result.id}`
        })
        reset()
        // Invalidate sketches list and investigation sketches
        queryClient.invalidateQueries({
          queryKey: queryKeys.sketches.list
        })
        if (investigationId) {
          queryClient.invalidateQueries({
            queryKey: queryKeys.investigations.sketches(investigationId)
          })
        }
        if (sketchId) setOpen(false)
      } else {
        toast.error(result.error || t('newSketch.toast.failed'))
      }
    },
    onError: (error) => {
      toast.error(error.message)
    }
  })

  async function onSubmit(data: FormValues) {
    if (!investigationId) {
      toast.error(t('newSketch.toast.noInvestigation'))
      return
    }

    try {
      const payload = {
        ...data,
        investigation_id: investigationId
      }
      await createSketchMutation.mutateAsync(JSON.stringify(payload))
    } catch (error) {
      console.error('Error creating sketch:', error)
    }
  }

  const formContent = (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="title">{t('newSketch.form.name')}</Label>
          <Input
            id="title"
            {...register('title', { required: t('newSketch.validation.titleRequired') })}
            placeholder={t('newSketch.form.namePlaceholder')}
            aria-invalid={errors.title ? 'true' : 'false'}
          />
          {errors.title && (
            <p role="alert" className="text-red-600 text-sm mt-1">
              {errors.title.message}
            </p>
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="description">{t('newSketch.form.desc')}</Label>
          <Input
            id="description"
            {...register('description')}
            placeholder={t('newSketch.form.descPlaceholder')}
          />
        </div>
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            reset()
            setOpen(false)
          }}
          disabled={isSubmitting}
        >
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? t('newSketch.form.saving') : t('newSketch.form.saveBtn')}
        </Button>
      </DialogFooter>
    </form>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <span role="button">{children}</span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('newSketch.title')}</DialogTitle>
          <DialogDescription>{t('newSketch.description')}</DialogDescription>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  )
}
