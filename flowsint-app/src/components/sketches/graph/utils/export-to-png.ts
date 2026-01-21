export const exportToPNG = async (canvaId: string, sketchId: string) => {
    if (!canvaId) {
        throw new Error('Graph ref not available')
    }
    // Get the canvas element from the ForceGraph2D component
    const canvas = document.getElementById(canvaId) as HTMLCanvasElement
    if (!canvas) {
        throw new Error('Canvas element not found')
    }
    return new Promise<void>((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) {
                reject(new Error('Failed to create image blob'))
                return
            }
            // Create download link
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `sketch-${sketchId || 'export'}-${Date.now()}.png`
            document.body.appendChild(a)
            a.click()
            // Cleanup
            URL.revokeObjectURL(url)
            document.body.removeChild(a)
            resolve()
        }, 'image/png')
    })
}