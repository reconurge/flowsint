import { isMac } from '@/lib/utils'
import { useEffect } from 'react'

type ShortcutOptions = {
  key: string
  ctrlOrCmd?: boolean
  alt?: boolean
  shift?: boolean
  callback: () => void
}
export function useKeyboardShortcut(options: ShortcutOptions) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const { key, ctrlKey, altKey, shiftKey, metaKey } = event
      if (key.toLowerCase() !== options.key.toLowerCase()) {
        return
      }
      const cmdKeyPressed = isMac ? metaKey : ctrlKey
      if (
        (options.ctrlOrCmd === undefined || options.ctrlOrCmd === cmdKeyPressed) &&
        (options.alt === undefined || options.alt === altKey) &&
        (options.shift === undefined || options.shift === shiftKey)
      ) {
        event.preventDefault()
        options.callback()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [options, isMac])
  return { isMac }
}
