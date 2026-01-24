import { useCallback, useEffect, useRef } from 'react'

export type ClipboardPayload =
  | { type: 'text'; text: string }
  | { type: 'html'; html: string }
  | { type: 'image'; file: File }
  | { type: 'files'; files: File[] }

export type PasteHandlers = Partial<{
  text: (text: string, event: ClipboardEvent | React.ClipboardEvent) => void
  html: (html: string, event: ClipboardEvent | React.ClipboardEvent) => void
  image: (file: File, event: ClipboardEvent | React.ClipboardEvent) => void
  files: (files: File[], event: ClipboardEvent | React.ClipboardEvent) => void
}>

export type UsePasteListenerOptions = {
  global?: boolean
  preventDefault?: boolean
}

function parseClipboard(data: DataTransfer): ClipboardPayload[] {
  const result: ClipboardPayload[] = []

  const text = data.getData('text/plain')
  if (text) {
    result.push({ type: 'text', text })
  }

  const html = data.getData('text/html')
  if (html) {
    result.push({ type: 'html', html })
  }

  const files = Array.from(data.files)
  if (files.length) {
    const images = files.filter((f) => f.type.startsWith('image/'))
    const others = files.filter((f) => !f.type.startsWith('image/'))

    images.forEach((file) => result.push({ type: 'image', file }))
    if (others.length) {
      result.push({ type: 'files', files: others })
    }
  }

  return result
}

export function usePasteListener(handlers: PasteHandlers, options: UsePasteListenerOptions = {}) {
  const { global = false, preventDefault = false } = options

  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  const listener = useCallback(
    (event: ClipboardEvent | React.ClipboardEvent) => {
      if (preventDefault) {
        event.preventDefault()
      }

      const clipboardData = event.clipboardData
      if (!clipboardData) return

      const payloads = parseClipboard(clipboardData)

      payloads.forEach((payload) => {
        const handler = handlersRef.current[payload.type]
        if (!handler) return

        switch (payload.type) {
          case 'text':
            handler(payload.text, event)
            break
          case 'html':
            handler(payload.html, event)
            break
          case 'image':
            handler(payload.file, event)
            break
          case 'files':
            handler(payload.files, event)
            break
        }
      })
    },
    [preventDefault]
  )

  useEffect(() => {
    if (!global) return

    window.addEventListener('paste', listener)
    return () => window.removeEventListener('paste', listener)
  }, [global, listener])

  return global ? undefined : listener
}
