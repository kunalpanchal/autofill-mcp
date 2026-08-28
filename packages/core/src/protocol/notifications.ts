export class NotificationBus {
  private readonly handlers = new Set<(method: string, params: unknown) => void>();

  emit(method: string, params: unknown): void {
    for (const handler of this.handlers) handler(method, params);
  }

  subscribe(handler: (method: string, params: unknown) => void): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }
}
