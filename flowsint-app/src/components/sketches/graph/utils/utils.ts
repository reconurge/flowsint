export function truncateText(text: string, limit: number = 16): string {
  if (text.length <= limit) return text
  return text.substring(0, limit) + '...'
}

/**
 * Calculate the actual rendered size of a node
 * This function MUST be used by both node-renderer and link-renderer to ensure consistency
 *
 * @param node - The node object with nodeSize and neighbors properties
 * @param forceSettings - Settings object containing nodeSize and nodeWeightMultiplierSize
 * @param shouldRenderDetails - Whether we're in detailed view (zoomed in)
 * @param zoomedOutMultiplier - Multiplier to apply when zoomed out (default from CONSTANTS.ZOOMED_OUT_SIZE_MULTIPLIER)
 * @returns The calculated node radius
 */
export function calculateNodeSize(
  node: any,
  forceSettings: any,
  shouldRenderDetails: boolean,
  zoomedOutMultiplier: number = 0.6
): number {
  const nodeSizeValue = forceSettings?.nodeSize?.value ?? 1
  const nodeWeightMultiplierSize = forceSettings?.nodeWeightMultiplierSize?.value ?? 1.5

  const sizeMultiplier = nodeSizeValue / 100 + 0.2
  const neighborBonus = Math.min((node.neighbors?.length || 0) / 5, 8) * nodeWeightMultiplierSize
  const baseSize = (node.nodeSize + neighborBonus) * sizeMultiplier

  return shouldRenderDetails ? baseSize : baseSize * zoomedOutMultiplier
}
