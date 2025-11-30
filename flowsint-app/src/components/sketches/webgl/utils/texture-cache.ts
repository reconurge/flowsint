import { Texture, Assets } from 'pixi.js'
import type { ItemType } from '@/stores/node-display-settings'

/**
 * Texture cache for icons
 * Manages loading and caching of SVG icon textures for optimal performance
 */
class TextureCache {
  private cache = new Map<string, Texture>()
  private loadingPromises = new Map<string, Promise<Texture>>()

  /**
   * Preload an icon texture
   * @param iconType - The type of icon to load
   * @returns Promise resolving to the loaded texture
   */
  async preload(iconType: ItemType): Promise<Texture> {
    const cacheKey = iconType

    // Return cached texture if available
    if (this.cache.has(cacheKey)) {
      return Promise.resolve(this.cache.get(cacheKey)!)
    }

    // Return existing promise if already loading
    if (this.loadingPromises.has(cacheKey)) {
      return this.loadingPromises.get(cacheKey)!
    }

    // Load the texture
    const promise = Assets.load(`/icons/${iconType}.svg`)
      .then((texture) => {
        this.cache.set(cacheKey, texture)
        this.loadingPromises.delete(cacheKey)
        return texture
      })
      .catch((error) => {
        this.loadingPromises.delete(cacheKey)
        console.warn(`Failed to load icon: ${iconType}`, error)
        throw new Error(`Failed to load icon: ${iconType}`)
      })

    this.loadingPromises.set(cacheKey, promise)
    return promise
  }

  /**
   * Get a texture from cache (synchronous)
   * @param iconType - The type of icon
   * @returns The cached texture or undefined
   */
  get(iconType: ItemType): Texture | undefined {
    return this.cache.get(iconType)
  }

  /**
   * Check if a texture is cached
   * @param iconType - The type of icon
   * @returns True if the texture is cached
   */
  has(iconType: ItemType): boolean {
    return this.cache.has(iconType)
  }

  /**
   * Preload multiple textures in parallel
   * @param iconTypes - Array of icon types to load
   * @returns Promise resolving when all textures are loaded
   */
  async preloadBatch(iconTypes: ItemType[]): Promise<void> {
    const uniqueTypes = Array.from(new Set(iconTypes))
    await Promise.all(
      uniqueTypes.map((type) => this.preload(type).catch(() => null))
    )
  }

  /**
   * Clear the cache (useful for memory management)
   */
  clear(): void {
    this.cache.clear()
    this.loadingPromises.clear()
  }

  /**
   * Get cache statistics
   * @returns Object with cache size and loading count
   */
  getStats(): { cached: number; loading: number } {
    return {
      cached: this.cache.size,
      loading: this.loadingPromises.size,
    }
  }
}

// Export singleton instance
export const textureCache = new TextureCache()
