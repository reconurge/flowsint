import { useState, useCallback } from 'react'
import { CheckIcon, CopyIcon } from 'lucide-react'
import { useTimeout } from 'usehooks-ts'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface CopyButtonProps {
  content: string
  delay?: number
  className?: string
  size?: "icon" | "default" | "sm" | "lg" | null | undefined
  label?: string
}

export function CopyButton({ content, className, label, delay = 2000, size = "icon" }: CopyButtonProps) {
  const [isCopied, setIsCopied] = useState(false)

  const handleCopy = useCallback(
    (e: { stopPropagation: () => void }) => {
      e.stopPropagation()
      navigator.clipboard.writeText(content).then(() => {
        setIsCopied(true)
      })
    },
    [content]
  )

  useTimeout(
    () => {
      if (isCopied) {
        setIsCopied(false)
      }
    },
    isCopied ? delay : null
  )

  return (
    <Tooltip open={isCopied}>
      <TooltipTrigger asChild>
        <Button
          className={cn('h-7', className)}
          size={label ? "default" : size}
          variant="ghost"
          onClick={handleCopy}
          aria-label="Copy content"
        >
          {isCopied ? (
            <CheckIcon className="!h-3.5 !w-3.5 text-primary" />
          ) : (
            <CopyIcon className="!h-3.5 !w-3.5 opacity-50" />
          )}{label && <span className='text-xs'>{label}</span>}
        </Button>
      </TooltipTrigger>
      <TooltipContent>Copied !</TooltipContent>
    </Tooltip>
  )
}
