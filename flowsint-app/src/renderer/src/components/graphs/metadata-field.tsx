import { useState } from 'react'
import { PlusCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface MetadataFieldProps {
  value: Record<string, string>
  onChange: (value: Record<string, string>) => void
  error?: string
  className?: string
}

export function MetadataField({ value = {}, onChange, error, className }: MetadataFieldProps) {
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  const handleAddPair = () => {
    if (!newKey.trim()) {
      setLocalError('Key cannot be empty.')
      return
    }

    if (value[newKey]) {
      setLocalError(`Key "${newKey}" already exists`)
      return
    }

    const updatedMetadata = {
      ...value,
      [newKey]: newValue
    }

    onChange(updatedMetadata)
    setNewKey('')
    setNewValue('')
    setLocalError(null)
  }

  const handleRemovePair = (key: string) => {
    const updatedMetadata = { ...value }
    delete updatedMetadata[key]
    onChange(updatedMetadata)
  }

  const handleKeyChange = (oldKey: string, newKey: string, itemValue: string) => {
    if (!newKey.trim()) {
      return
    }

    if (newKey !== oldKey && value[newKey]) {
      setLocalError(`Key "${newKey}" already exists`)
      return
    }

    const updatedMetadata = { ...value }
    delete updatedMetadata[oldKey]
    updatedMetadata[newKey] = itemValue
    onChange(updatedMetadata)
    setLocalError(null)
  }

  const handleValueChange = (key: string, newValue: string) => {
    const updatedMetadata = {
      ...value,
      [key]: newValue
    }
    onChange(updatedMetadata)
  }

  return (
    <div className={cn('space-y-3', className)}>
      {Object.entries(value).length > 0 && (
        <div className="space-y-2">
          {Object.entries(value).map(([key, val]) => (
            <div key={key} className="flex items-center gap-2">
              <Input
                value={key}
                onChange={(e) => handleKeyChange(key, e.target.value, val)}
                placeholder="Clé"
                className="flex-1"
              />
              <span className="text-muted-foreground">:</span>
              <Input
                value={val}
                onChange={(e) => handleValueChange(key, e.target.value)}
                placeholder="Valeur"
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleRemovePair(key)}
                className="h-8 w-8 text-destructive"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Supprimer</span>
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Formulaire pour ajouter une nouvelle paire */}
      <div className="flex items-end gap-2">
        <div className="space-y-1 flex-1">
          <Input
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder="Key"
            className={localError ? 'border-destructive' : ''}
          />
        </div>
        <span className="text-muted-foreground mb-2.5">:</span>
        <div className="space-y-1 flex-1">
          <Input
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder="Value"
          />
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleAddPair}
          className="mb-0.5"
        >
          <PlusCircle className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>

      {/* Affichage des erreurs */}
      {(localError || error) && <p className="text-xs text-destructive">{localError || error}</p>}
    </div>
  )
}
