export function safeURL(value: string, protocols: readonly string[]): string | undefined {
  const url = value.trim()
  if (!url || /[\x00-\x20\x7f\\]/.test(url) || url.startsWith('//')) return
  try {
    const parsed = new URL(url, 'https://editor.invalid/')
    if (protocols.includes(parsed.protocol)) return url
  } catch {
    return
  }
}

export const webProtocols = ['https:', 'http:']
export const linkProtocols = [...webProtocols, 'mailto:', 'tel:']
