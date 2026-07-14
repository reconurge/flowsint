import { useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { useRouter, useParams } from '@tanstack/react-router'
import { toast } from 'sonner'
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
import { analysisService } from '@/api/analysis-service'
import { useTranslation } from 'react-i18next'

interface FormValues {
  title: string
}

interface NewAnalysisProps {
  children: ReactNode
}

export default function NewAnalysis({ children }: NewAnalysisProps) {
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
  const createAnalysisMutation = useMutation({
    mutationFn: analysisService.create,
    onSuccess: (result) => {
      if (result.id) {
        toast.success(t('newAnalysis.toast.success'))
        router.navigate({
          to: `/dashboard/investigations/${investigationId}/analysis/${result.id}`
        })
        reset()
        // Invalidate sketches list and investigation sketches
        queryClient.invalidateQueries({
          queryKey: queryKeys.analyses.list
        })
        if (investigationId) {
          queryClient.invalidateQueries({
            queryKey: queryKeys.investigations.analyses(investigationId)
          })
        }
        if (sketchId) setOpen(false)
      } else {
        toast.error(result.error || t('newAnalysis.toast.failed'))
      }
    },
    onError: (error) => {
      toast.error(error.message)
    }
  })

  async function onSubmit(data: FormValues) {
    if (!investigationId) {
      toast.error(t('newAnalysis.toast.noInvestigation'))
      return
    }

    try {
      const payload = {
        ...data,
        investigation_id: investigationId
      }
      await createAnalysisMutation.mutateAsync(JSON.stringify(payload))
    } catch (error) {
      console.error('Error creating sketch:', error)
    }
  }

  const formContent = (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="title">{t('newAnalysis.form.name')}</Label>
          <Input
            id="title"
            {...register('title', { required: t('newAnalysis.validation.titleRequired') })}
            placeholder={t('newAnalysis.form.namePlaceholder')}
            aria-invalid={errors.title ? 'true' : 'false'}
          />
          {errors.title && (
            <p role="alert" className="text-red-600 text-sm mt-1">
              {errors.title.message}
            </p>
          )}
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
          {isSubmitting ? t('newAnalysis.form.saving') : t('newAnalysis.form.saveBtn')}
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
          <DialogTitle>{t('newAnalysis.title')}</DialogTitle>
          <DialogDescription>{t('newAnalysis.description')}</DialogDescription>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  )
}
