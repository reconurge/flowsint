import * as React from 'react'
import { useState, useRef, useCallback, useEffect } from 'react'
import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export interface TagInputProps {
  value: string[]
  onChange: (value: string[]) => void
  options?: { label: string; value: string }[]
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function TagInput({
  value = [],
  onChange,
  options,
  placeholder = 'Add a value...',
  className,
  disabled = false
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const filteredOptions = options?.filter(
    (opt) =>
      !value.includes(opt.value) &&
      opt.label.toLowerCase().includes(inputValue.toLowerCase())
  )

  const showDropdown = isOpen && filteredOptions && filteredOptions.length > 0

  const addTag = useCallback(
    (tag: string) => {
      const trimmed = tag.trim()
      if (!trimmed || value.includes(trimmed)) return
      onChange([...value, trimmed])
      setInputValue('')
      setActiveIndex(-1)
    },
    [value, onChange]
  )

  const removeTag = useCallback(
    (tag: string) => {
      onChange(value.filter((v) => v !== tag))
    },
    [value, onChange]
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (showDropdown && activeIndex >= 0 && filteredOptions[activeIndex]) {
        addTag(filteredOptions[activeIndex].value)
      } else if (inputValue.trim()) {
        addTag(inputValue)
      }
      return
    }

    if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeTag(value[value.length - 1])
      return
    }

    if (e.key === ',' || e.key === 'Tab') {
      if (inputValue.trim()) {
        e.preventDefault()
        addTag(inputValue)
      }
      return
    }

    if (showDropdown) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((prev) =>
          prev < filteredOptions!.length - 1 ? prev + 1 : 0
        )
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((prev) =>
          prev > 0 ? prev - 1 : filteredOptions!.length - 1
        )
      } else if (e.key === 'Escape') {
        setIsOpen(false)
        setActiveIndex(-1)
      }
    }
  }

  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const item = listRef.current.children[activeIndex] as HTMLElement
      item?.scrollIntoView({ block: 'nearest' })
    }
  }, [activeIndex])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setActiveIndex(-1)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getLabel = (val: string) => {
    if (!options) return val
    return options.find((o) => o.value === val)?.label ?? val
  }

  return (
    <div ref={containerRef} className="relative">
      <div
        className={cn(
          'border-input bg-background flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors',
          'focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]',
          disabled && 'cursor-not-allowed opacity-50',
          className
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag) => (
          <Badge
            key={tag}
            variant="secondary"
            className="gap-1 pl-2 pr-1 py-0.5 text-xs font-normal animate-in fade-in-0 zoom-in-95"
          >
            <span className="max-w-[150px] truncate">{getLabel(tag)}</span>
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  removeTag(tag)
                }}
                className="text-muted-foreground hover:text-foreground rounded-sm p-0.5 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </Badge>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value)
            setIsOpen(true)
            setActiveIndex(-1)
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ''}
          disabled={disabled}
          className="flex-1 min-w-[80px] bg-transparent outline-none placeholder:text-muted-foreground text-sm"
        />
      </div>

      {showDropdown && (
        <div
          ref={listRef}
          className="bg-popover text-popover-foreground absolute z-50 mt-1 max-h-[200px] w-full overflow-y-auto rounded-md border shadow-md animate-in fade-in-0 zoom-in-95"
        >
          {filteredOptions.map((opt, i) => (
            <div
              key={opt.value}
              onMouseDown={(e) => {
                e.preventDefault()
                addTag(opt.value)
              }}
              onMouseEnter={() => setActiveIndex(i)}
              className={cn(
                'flex cursor-pointer items-center px-3 py-1.5 text-sm transition-colors',
                i === activeIndex && 'bg-accent text-accent-foreground'
              )}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
