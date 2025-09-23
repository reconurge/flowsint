import React from 'react'

interface ContextMenuProps {
  top?: number
  left?: number
  right?: number
  bottom?: number
  wrapperWidth: number
  wrapperHeight: number
  children: React.ReactNode
  // Raw position for overflow calculation
  rawTop?: number
  rawLeft?: number
}

export default function ContextMenu({
  top,
  left,
  right,
  bottom,
  wrapperWidth,
  wrapperHeight,
  rawTop,
  rawLeft,
  children,
  ...props
}: ContextMenuProps): JSX.Element {
  // If raw position is provided, calculate overflow and adjust position
  let finalTop = top
  let finalLeft = left
  let finalRight = right
  let finalBottom = bottom

  if (rawTop !== undefined && rawLeft !== undefined) {
    // Calculate available space in each direction
    const menuWidth = 320 // Default menu width
    const menuHeight = 250 // Use a more reasonable height for overflow calculation
    const padding = 20 // Minimum padding from edges

    // Determine if menu would overflow in each direction
    const wouldOverflowRight = rawLeft + menuWidth + padding > wrapperWidth
    const wouldOverflowBottom = rawTop + menuHeight + padding > wrapperHeight

    // Calculate final position
    finalTop = 0
    finalLeft = 0
    finalRight = 0
    finalBottom = 0

    if (wouldOverflowRight) {
      finalRight = wrapperWidth - rawLeft
    } else {
      finalLeft = rawLeft
    }

    if (wouldOverflowBottom) {
      finalBottom = wrapperHeight - rawTop
    } else {
      finalTop = rawTop
    }
  }

  // Calculate dynamic dimensions based on available space
  const maxWidth = 320 // Default width (w-80)
  const maxHeight = 500 // Default height (h-96)
  const minWidth = 280 // Minimum width
  const minHeight = 200 // Minimum height

  // Calculate available space based on menu position and wrapper dimensions
  let availableWidth = maxWidth
  let availableHeight = maxHeight

  if (finalLeft && finalLeft > 0) {
    // Menu is positioned from left, so available width is from left to right edge
    availableWidth = wrapperWidth - finalLeft - 20 // 20px padding from right edge
  } else if (finalRight && finalRight > 0) {
    // Menu is positioned from right, so available width is from left edge to right position
    availableWidth = wrapperWidth - finalRight - 20 // 20px padding from left edge
  }

  if (finalTop && finalTop > 0) {
    // Menu is positioned from top, so available height is from top to bottom edge
    availableHeight = wrapperHeight - finalTop - 20 // 20px padding from bottom edge
  } else if (finalBottom && finalBottom > 0) {
    // Menu is positioned from bottom, so available height is from top edge to bottom position
    availableHeight = wrapperHeight - finalBottom - 20 // 20px padding from top edge
  }

  // Determine dynamic dimensions
  const dynamicWidth = Math.min(maxWidth, Math.max(minWidth, availableWidth))
  const dynamicHeight = Math.min(maxHeight, Math.max(minHeight, availableHeight))

  // Calculate dynamic styles
  const dynamicStyles = {
    width: `${dynamicWidth}px`,
    maxHeight: `${dynamicHeight}px`,
    top: finalTop && finalTop > 0 ? `${finalTop}px` : 'auto',
    left: finalLeft && finalLeft > 0 ? `${finalLeft}px` : 'auto',
    right: finalRight && finalRight > 0 ? `${finalRight}px` : 'auto',
    bottom: finalBottom && finalBottom > 0 ? `${finalBottom}px` : 'auto'
  }

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  return (
    <div
      style={dynamicStyles}
      className="bg-background/90 backdrop-blur-sm border border-border flex flex-col rounded-lg shadow-lg absolute z-50"
      onClick={handleMenuClick}
      {...props}
    >
      {children}
    </div>
  )
}
