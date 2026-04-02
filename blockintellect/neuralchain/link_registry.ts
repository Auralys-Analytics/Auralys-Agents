export interface InputLink {
  id: string
  source: string
  url: string
  metadata?: Record<string, any>
}

export interface InputLinkResult {
  success: boolean
  link?: InputLink
  error?: string
}

export class InputLinkHandler {
  private readonly links = new Map<string, InputLink>()

  /** Register a new link */
  register(link: InputLink): InputLinkResult {
    if (this.links.has(link.id)) {
      return { success: false, error: `Link with id "${link.id}" already exists.` }
    }
    this.links.set(link.id, { ...link })
    return { success: true, link: { ...link } }
  }

  /** Register multiple links at once */
  registerMany(links: InputLink[]): InputLinkResult[] {
    return links.map((link) => this.register(link))
  }

  /** Retrieve a link by id */
  get(id: string): InputLinkResult {
    const link = this.links.get(id)
    if (!link) {
      return { success: false, error: `No link found for id "${id}".` }
    }
    return { success: true, link: { ...link } }
  }

  /** List all registered links */
  list(): InputLink[] {
    return Array.from(this.links.values()).map((l) => ({ ...l }))
  }

  /** Remove a link by id */
  unregister(id: string): boolean {
    return this.links.delete(id)
  }

  /** Check if a link exists */
  has(id: string): boolean {
    return this.links.has(id)
  }

  /** Clear all links */
  clear(): void {
    this.links.clear()
  }
}
