import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebglAddon } from '@xterm/addon-webgl'
import '@xterm/xterm/css/xterm.css'

export interface TerminalHandle {
  write: (data: string) => void
  writeln: (data: string) => void
  clear: () => void
  reset: () => void
}

interface XTermTerminalProps {
  className?: string
  onReady?: (terminal: Terminal) => void
}

export const XTermTerminal = forwardRef<TerminalHandle, XTermTerminalProps>(
  ({ className, onReady }, ref) => {
    const terminalRef = useRef<HTMLDivElement>(null)
    const xtermRef = useRef<Terminal | null>(null)
    const fitAddonRef = useRef<FitAddon | null>(null)

    useImperativeHandle(ref, () => ({
      write: (data: string) => {
        xtermRef.current?.write(data)
      },
      writeln: (data: string) => {
        xtermRef.current?.writeln(data)
      },
      clear: () => {
        xtermRef.current?.clear()
      },
      reset: () => {
        xtermRef.current?.reset()
      }
    }))

    useEffect(() => {
      if (!terminalRef.current) return

      // Detect dark mode
      const isDark = document.documentElement.classList.contains('dark')

      // Light theme colors
      const lightTheme = {
        background: '#fcfcfc',
        foreground: '#1a1a1a',
        cursor: '#3b82f6',
        cursorAccent: '#1e40af',
        selectionBackground: '#3b82f640',
        selectionForeground: '#1a1a1a',
        black: '#1a1a1a',
        red: '#dc2626',
        green: '#16a34a',
        yellow: '#ca8a04',
        blue: '#2563eb',
        magenta: '#9333ea',
        cyan: '#0891b2',
        white: '#737373',
        brightBlack: '#525252',
        brightRed: '#ef4444',
        brightGreen: '#22c55e',
        brightYellow: '#eab308',
        brightBlue: '#3b82f6',
        brightMagenta: '#a855f7',
        brightCyan: '#06b6d4',
        brightWhite: '#171717',
      }

      // Dark theme colors
      const darkTheme = {
        background: '#1b1b1b',
        foreground: '#e5e5e5',
        cursor: '#3b82f6',
        cursorAccent: '#1e40af',
        selectionBackground: '#3b82f640',
        selectionForeground: '#e5e5e5',
        black: '#18181b',
        red: '#ef4444',
        green: '#22c55e',
        yellow: '#eab308',
        blue: '#3b82f6',
        magenta: '#a855f7',
        cyan: '#06b6d4',
        white: '#e5e5e5',
        brightBlack: '#52525b',
        brightRed: '#f87171',
        brightGreen: '#4ade80',
        brightYellow: '#facc15',
        brightBlue: '#60a5fa',
        brightMagenta: '#c084fc',
        brightCyan: '#22d3ee',
        brightWhite: '#fafafa',
      }

      const terminal = new Terminal({
        fontFamily: '"Fira Code", "JetBrains Mono", "Cascadia Code", Menlo, Monaco, "Courier New", monospace',
        fontSize: 13,
        lineHeight: 1.4,
        cursorBlink: false,
        cursorStyle: 'block',
        theme: isDark ? darkTheme : lightTheme,
        allowProposedApi: true,
        scrollback: 10000,
        convertEol: true,
        disableStdin: true,
        allowTransparency: false,
      })

      // Setup addons
      const fitAddon = new FitAddon()
      terminal.loadAddon(fitAddon)

      // Open terminal
      terminal.open(terminalRef.current)

      // Try to load WebGL addon for better performance
      try {
        const webglAddon = new WebglAddon()
        webglAddon.onContextLoss(() => {
          webglAddon.dispose()
        })
        terminal.loadAddon(webglAddon)
      } catch (e) {
        console.warn('WebGL addon could not be loaded, falling back to canvas renderer', e)
      }

      // Fit terminal to container
      fitAddon.fit()

      // Store references
      xtermRef.current = terminal
      fitAddonRef.current = fitAddon

      // Notify parent component
      onReady?.(terminal)

      // Handle resize
      const resizeObserver = new ResizeObserver(() => {
        fitAddon.fit()
      })
      resizeObserver.observe(terminalRef.current)

      // Watch for theme changes (dark/light mode)
      const themeObserver = new MutationObserver(() => {
        const isDark = document.documentElement.classList.contains('dark')
        const newTheme = isDark ? darkTheme : lightTheme
        terminal.options.theme = newTheme
      })

      themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class']
      })

      // Cleanup
      return () => {
        resizeObserver.disconnect()
        themeObserver.disconnect()
        terminal.dispose()
      }
    }, [onReady])

    return <div ref={terminalRef} className={className} />
  }
)

XTermTerminal.displayName = 'XTermTerminal'
