import { useRef, useCallback } from 'react'

export function useThrottle<T extends (...args: any[]) => void>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  // Date.now() is impure to call during render, even guarded — start at 0
  // instead of a captured mount timestamp. Only changes behavior for a call
  // within `delay`ms of mount, and even then it's arguably more correct:
  // 0 means "nothing has run yet", so the very first call fires immediately
  // (the standard leading-edge throttle behavior) rather than being held
  // back by an arbitrary mount-time baseline.
  const lastRan = useRef(0)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  return useCallback(
    (...args: Parameters<T>) => {
      const handler = () => {
        if (Date.now() - lastRan.current >= delay) {
          callback(...args)
          lastRan.current = Date.now()
        } else {
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
          }
          timeoutRef.current = setTimeout(
            () => {
              callback(...args)
              lastRan.current = Date.now()
            },
            delay - (Date.now() - lastRan.current)
          )
        }
      }

      handler()
    },
    [callback, delay]
  )
}
