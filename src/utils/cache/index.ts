export class SessionCache<T> {
  private cache: Map<string, { data: T; timestamp: number }>;
  private readonly duration: number;

  constructor(duration = 5 * 60 * 1000) {
    this.cache = new Map();
    this.duration = duration;
  }
  
  protected generateKey(params: Record<string, string | null>): string {
    return Object.entries(params)
      .filter(([_, value]) => value !== null)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}:${value}`)
      .join('|');
  }

  get(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > this.duration) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  set(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clear(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }
}

export class ShopifySessionCache extends SessionCache<ShopifySessionState> {
  getKey(shop: string | null, sessionId: string | null): string {
    return this.generateKey({ shop, sessionId });
  }
}