export function truncateText(text: string, limit: number = 16): string {
  if (text.length <= limit) return text
  return text.substring(0, limit) + '...'
}
