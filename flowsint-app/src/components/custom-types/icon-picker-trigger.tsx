import { useState } from 'react'
import * as LucideIcons from 'lucide-react'
import { cn } from '@/lib/utils'
import IconPicker from '@/components/shared/icon-picker/popup'

interface IconPickerTriggerProps {
  icon: string
  color: string
  onIconChange: (icon: string) => void
}

export function IconPickerTrigger({ icon, color, onIconChange }: IconPickerTriggerProps) {
  const [open, setOpen] = useState(false)

  const Icon = (LucideIcons as any)[icon] || LucideIcons.FileQuestion

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          'group relative flex items-center justify-center rounded-full transition-all',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
        )}
        style={{
          backgroundColor: color,
          width: 52,
          height: 52
        }}
      >
        <Icon className="text-white" size={26} />
        <div
          className={cn(
            'absolute inset-0 rounded-xl bg-black/0 transition-colors',
            'group-hover:bg-black/10'
          )}
        />
      </button>

      <IconPicker
        iconType={null}
        open={open}
        setOpen={setOpen}
        onIconChange={(_type, iconName) => {
          onIconChange(iconName as string)
        }}
      />
    </>
  )
}
