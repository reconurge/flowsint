import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useKeyboardShortcut } from '@/hooks/use-keyboard-shortcut'

interface SaveModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (name: string, description: string) => void
  isLoading: boolean
  initialName?: string
  initialDescription?: string
}

export function SaveModal({ open, onOpenChange, onSave, isLoading, initialName, initialDescription }: SaveModalProps) {
  const [name, setName] = useState(initialName || 'My Enricher')
  const [description, setDescription] = useState(initialDescription || '')
  const [nameError, setNameError] = useState('')

  // Update state when modal opens with new initial values
  useEffect(() => {
    if (open) {
      setName(initialName || 'My Enricher')
      setDescription(initialDescription || '')
      setNameError('')
    }
  }, [open, initialName, initialDescription])

  useKeyboardShortcut({
    key: 's',
    ctrlOrCmd: true,
    callback: () => {
      handleSave()
    }
  })

  const handleSave = () => {
    if (!name.trim()) {
      setNameError('Flow name is required')
      return
    }
    onSave(name, description)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Save Flow</DialogTitle>
          <DialogDescription>
            Give your flow a name and description before saving.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name" className="flex items-center justify-between">
              Name
              {nameError && <span className="text-xs text-destructive">{nameError}</span>}
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (e.target.value.trim()) setNameError('')
              }}
              placeholder="Enter flow name"
              className={nameError ? 'border-destructive' : ''}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter a description (optional)"
              className="resize-none"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save flow'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
