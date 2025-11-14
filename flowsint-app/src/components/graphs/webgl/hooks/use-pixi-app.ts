import { useEffect, useRef, useState } from 'react'
import { Application, Container } from 'pixi.js'
import { GRAPH_CONSTANTS } from '../constants'

/**
 * Hook to manage Pixi.js Application lifecycle
 *
 * @param container - HTML div container element
 * @returns Pixi app, stage, and containers
 */
export function usePixiApp(container: HTMLDivElement | null) {
  const [app, setApp] = useState<Application | null>(null)
  const [containers, setContainers] = useState<{
    linkContainer: Container
    edgeLabelContainer: Container
    nodeContainer: Container
    labelContainer: Container
  } | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!container) return

    let mounted = true

    const initApp = async () => {
      const rect = container.getBoundingClientRect()
      const width = rect.width
      const height = rect.height

      // Create Pixi application
      const pixiApp = new Application()
      await pixiApp.init({
        width,
        height,
        backgroundColor: GRAPH_CONSTANTS.BACKGROUND_COLOR,
        antialias: true,
        autoStart: false, // Manual rendering for performance
        autoDensity: true,
        resolution: Math.max(
          window.devicePixelRatio || 1,
          GRAPH_CONSTANTS.DEVICE_PIXEL_RATIO_MIN
        ),
      })

      if (!mounted) {
        pixiApp.destroy(true)
        return
      }

      container.appendChild(pixiApp.canvas)

      const stage = pixiApp.stage
      stage.interactive = true
      stage.eventMode = 'static'

      // Create layer containers
      const linkContainer = new Container()
      const edgeLabelContainer = new Container()
      const nodeContainer = new Container()
      const labelContainer = new Container()

      stage.addChild(linkContainer, edgeLabelContainer, nodeContainer, labelContainer)

      setApp(pixiApp)
      setContainers({ linkContainer, edgeLabelContainer, nodeContainer, labelContainer })

      // Cleanup function
      cleanupRef.current = () => {
        if (pixiApp) {
          pixiApp.destroy(true, {
            children: true,
            texture: false, // Keep textures cached
            textureSource: false,
          })
        }
      }
    }

    initApp()

    return () => {
      mounted = false
      if (cleanupRef.current) {
        cleanupRef.current()
        cleanupRef.current = null
      }
    }
  }, [container])

  return { app, containers }
}
