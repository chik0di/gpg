export async function workspaceRequest<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: 'no-store', ...options })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Could not load your workspace.')
  return data
}
export async function workspaceList<T>(resource: 'projects' | 'bibliographies'): Promise<T[]> {
  const items: T[] = []
  for (let page = 0; ; page++) {
    const data = await workspaceRequest<{ items: T[]; hasMore: boolean }>(`/api/workspace/${resource}?page=${page}`)
    items.push(...data.items)
    if (!data.hasMore) return items
  }
}
