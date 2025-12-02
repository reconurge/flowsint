const imageCache = new Map<string, HTMLImageElement>()
const imageLoadPromises = new Map<string, Promise<HTMLImageElement>>()

export const preloadImage = (iconType: string): Promise<HTMLImageElement> => {
  const cacheKey = iconType

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
    img.src = `/icons/${iconType}.svg`
  })

  imageLoadPromises.set(cacheKey, promise)
  return promise
}

export const getCachedImage = (iconType: string): HTMLImageElement | undefined => {
  return imageCache.get(iconType)
}
