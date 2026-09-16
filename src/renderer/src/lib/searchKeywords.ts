/**
 * Splits a search query with ASCII or Chinese semicolons. Spaces remain part
 * of a keyword, allowing file names that contain spaces to be searched as-is.
 * Repeated keywords are removed case-insensitively.
 */
export function parseSearchKeywords(query: string): string[] {
  const keywords: string[] = []
  const seen = new Set<string>()
  for (const part of query.split(/[;；]+/)) {
    const keyword = part.trim()
    const normalized = keyword.toLocaleLowerCase()
    if (keyword && !seen.has(normalized)) {
      keywords.push(keyword)
      seen.add(normalized)
    }
  }

  return keywords
}

export function matchesAnyKeyword(value: string, keywords: string[]): boolean {
  const normalizedValue = value.toLocaleLowerCase()
  return keywords.some((keyword) => normalizedValue.includes(keyword.toLocaleLowerCase()))
}
