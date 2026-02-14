import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Check } from 'lucide-react'

const PRESET_COLORS = [
  // Row 1 - Muted naturals
  '#9B8E7E',
  '#A89F91',
  '#8E9E8C',
  '#7E9BA3',
  '#8A8DA3',
  '#9E8A9E',
  '#A3908A',
  '#8C9696',
  '#A39882',
  '#7E8F9E',
  // Row 2 - Soft pastels
  '#66A892',
  '#8E7CC3',
  '#5AA1C8',
  '#4CB5AE',
  '#8B83C1',
  '#BCA18A',
  '#4C8EDA',
  '#A76DAA',
  '#D97474',
  '#80BF80',
  // Row 3 - Warm tones
  '#D4B030',
  '#E3A857',
  '#CC7A7A',
  '#D279A6',
  '#E98973',
  '#C7BF50',
  '#A8BF50',
  '#6FA8DC',
  '#7C9CBF',
  '#897FC9'
]

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  /** Size of the trigger swatch */
  triggerSize?: 'sm' | 'md'
  /** Popover alignment */
  align?: 'start' | 'center' | 'end'
}

export function ColorPicker({
  value,
  onChange,
  triggerSize = 'md',
  align = 'start'
}: ColorPickerProps) {
  const [open, setOpen] = useState(false)
  const [customColor, setCustomColor] = useState(value)

  useEffect(() => {
    setCustomColor(value)
  }, [value])

  const handleCustomColorChange = (hex: string) => {
    setCustomColor(hex)
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      onChange(hex)
    }
  }

  const sizeClasses = triggerSize === 'sm' ? 'h-6 w-6 rounded-md' : 'h-8 w-8 rounded-lg'

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <button
          className={cn(
            sizeClasses,
            'border border-border/50 transition-colors',
            'hover:border-border',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          )}
          style={{ backgroundColor: value }}
        />
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-3" align={align}>
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground">Color</p>
          <div className="grid grid-cols-10 gap-1.5">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                className={cn(
                  'h-6 w-6 rounded-md transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  value === color && 'ring-2 ring-foreground ring-offset-2 ring-offset-background'
                )}
                style={{ backgroundColor: color }}
                onClick={() => {
                  onChange(color)
                  setCustomColor(color)
                }}
              >
                {value === color && <Check className="h-3 w-3 text-white mx-auto" />}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={customColor}
              onChange={(e) => {
                setCustomColor(e.target.value)
                onChange(e.target.value)
              }}
              className="h-8 w-8 rounded-md border border-border/50 shrink-0 cursor-pointer bg-transparent p-0.5"
            />
            <Input
              value={customColor}
              onChange={(e) => handleCustomColorChange(e.target.value)}
              placeholder="#000000"
              className="h-8 text-xs font-mono"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
