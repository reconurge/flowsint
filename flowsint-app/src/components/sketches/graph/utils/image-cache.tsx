import { TYPE_TO_ICON, useNodesDisplaySettings } from '@/stores/node-display-settings'
//@ts-ignore
import * as lucideIcons from 'lucide-react/dist/esm/icons'
import { renderToStaticMarkup } from 'react-dom/server'

const imageCache = new Map<string, HTMLImageElement>()
const imageLoadPromises = new Map<string, Promise<HTMLImageElement>>()

const FALLBACK_SVG = (color: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="${color}" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>`

const createSvgFromIconName = (iconName: string, color: string): string => {
  const IconComponent = (lucideIcons as any)[iconName]

  let svgString: string
  if (IconComponent) {
    try {
      svgString = renderToStaticMarkup(<IconComponent color={color} />)
    } catch (err) {
      console.warn('[icon] Failed to render icon:', iconName)
      svgString = FALLBACK_SVG(color)
    }
  } else {
    console.warn('[icon] Icon not found:', iconName)
    svgString = FALLBACK_SVG(color)
  }

  const utf8 = encodeURIComponent(svgString).replace(/%([0-9A-F]{2})/g, (_, p1) =>
    String.fromCharCode(parseInt(p1, 16))
  )

  return `data:image/svg+xml;base64,${btoa(utf8)}`
}

const createSvgDataUrl = (iconType: string, color: string = '#FFFFFF'): string => {
  const customIcons = useNodesDisplaySettings.getState().customIcons
  const iconName = customIcons[iconType] || TYPE_TO_ICON[iconType] || TYPE_TO_ICON.default
  return createSvgFromIconName(iconName, color)
}

export const preloadImage = (
  iconType: string,
  color: string = '#FFFFFF'
): Promise<HTMLImageElement> => {
  const cacheKey = `${iconType}-${color}`

  if (imageCache.has(cacheKey)) {
    return Promise.resolve(imageCache.get(cacheKey)!)
  }

  if (imageLoadPromises.has(cacheKey)) {
    return imageLoadPromises.get(cacheKey)!
  }

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      imageCache.set(cacheKey, img)
      imageLoadPromises.delete(cacheKey)
      resolve(img)
    }
    img.onerror = () => {
      imageLoadPromises.delete(cacheKey)
      reject(new Error(`Failed to load icon: ${iconType}`))
    }

    img.src = createSvgDataUrl(iconType, color)
  })

  imageLoadPromises.set(cacheKey, promise)
  return promise
}

export const getCachedImage = (
  iconType: string,
  color: string = '#FFFFFF'
): HTMLImageElement | undefined => {
  return imageCache.get(`${iconType}-${color}`)
}

// Direct icon name lookup (bypasses type→icon mapping)
export const preloadIconByName = (
  iconName: string,
  color: string = '#FFFFFF'
): Promise<HTMLImageElement> => {
  const cacheKey = `icon-${iconName}-${color}`

  if (imageCache.has(cacheKey)) {
    return Promise.resolve(imageCache.get(cacheKey)!)
  }

  if (imageLoadPromises.has(cacheKey)) {
    return imageLoadPromises.get(cacheKey)!
  }

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      imageCache.set(cacheKey, img)
      imageLoadPromises.delete(cacheKey)
      resolve(img)
    }
    img.onerror = () => {
      imageLoadPromises.delete(cacheKey)
      reject(new Error(`Failed to load icon: ${iconName}`))
    }

    img.src = createSvgFromIconName(iconName, color)
  })

  imageLoadPromises.set(cacheKey, promise)
  return promise
}

export const getCachedIconByName = (
  iconName: string,
  color: string = '#FFFFFF'
): HTMLImageElement | undefined => {
  return imageCache.get(`icon-${iconName}-${color}`)
}

// External image caching (for nodeImage URLs)
export const preloadExternalImage = (url: string): Promise<HTMLImageElement> => {
  const cacheKey = `ext-${url}`

  if (imageCache.has(cacheKey)) {
    return Promise.resolve(imageCache.get(cacheKey)!)
  }

  if (imageLoadPromises.has(cacheKey)) {
    return imageLoadPromises.get(cacheKey)!
  }

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      imageCache.set(cacheKey, img)
      imageLoadPromises.delete(cacheKey)
      resolve(img)
    }
    img.onerror = () => {
      imageLoadPromises.delete(cacheKey)
      reject(new Error(`Failed to load external image: ${url}`))
    }

    img.src = url
  })

  imageLoadPromises.set(cacheKey, promise)
  return promise
}

export const getCachedExternalImage = (url: string): HTMLImageElement | undefined => {
  return imageCache.get(`ext-${url}`)
}

const createFlagSvgDataUrl = (strokeColor: string, fillColor: string): string => {
  const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" fill="${fillColor}" stroke="${strokeColor}"/>
  <line x1="4" x2="4" y1="22" y2="15" stroke="${strokeColor}" fill="none"/>
</svg>`

  const utf8 = encodeURIComponent(svgString).replace(/%([0-9A-F]{2})/g, (_, p1) =>
    String.fromCharCode(parseInt(p1, 16))
  )

  return `data:image/svg+xml;base64,${btoa(utf8)}`
}

export const preloadFlagImage = (
  strokeColor: string,
  fillColor: string
): Promise<HTMLImageElement> => {
  const cacheKey = `flag-${strokeColor}-${fillColor}`

  if (imageCache.has(cacheKey)) {
    return Promise.resolve(imageCache.get(cacheKey)!)
  }

  if (imageLoadPromises.has(cacheKey)) {
    return imageLoadPromises.get(cacheKey)!
  }

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      imageCache.set(cacheKey, img)
      imageLoadPromises.delete(cacheKey)
      resolve(img)
    }
    img.onerror = () => {
      imageLoadPromises.delete(cacheKey)
      reject(new Error(`Failed to load flag with colors: ${strokeColor}, ${fillColor}`))
    }

    img.src = createFlagSvgDataUrl(strokeColor, fillColor)
  })

  imageLoadPromises.set(cacheKey, promise)
  return promise
}

export const getCachedFlagImage = (
  strokeColor: string,
  fillColor: string
): HTMLImageElement | undefined => {
  return imageCache.get(`flag-${strokeColor}-${fillColor}`)
}

export const clearImageCache = (): void => {
  imageCache.clear()
  imageLoadPromises.clear()
  console.log('[image-cache] Cache cleared')
}

export const clearIconTypeCache = (iconType: string): void => {
  // Clear all cached versions of this icon type (different colors)
  const keysToDelete: string[] = []
  imageCache.forEach((_, key) => {
    if (key.startsWith(`${iconType}-`)) {
      keysToDelete.push(key)
    }
  })
  keysToDelete.forEach((key) => {
    imageCache.delete(key)
    imageLoadPromises.delete(key)
  })
  console.log(`[image-cache] Cleared cache for icon type: ${iconType}`)
}
