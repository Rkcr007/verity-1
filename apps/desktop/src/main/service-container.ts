/**
 * ServiceContainer (resolution I-01, architecture §2.1).
 *
 * A minimal, type-safe, manual DI container — no decorators, no reflection.
 * Services are registered as lazy singleton factories and resolved on demand.
 * `dispose()` tears them down in reverse registration order (LIFO), which is
 * correct for resource handles (e.g. the database closes after its consumers).
 */
export type ServiceToken<T> = symbol & { readonly __type?: T };

export function createToken<T>(description: string): ServiceToken<T> {
  return Symbol(description) as ServiceToken<T>;
}

type Factory<T> = (container: ServiceContainer) => T;

interface Registration<T> {
  factory: Factory<T>;
  instance?: T;
  dispose?: (instance: T) => void | Promise<void>;
}

export class ServiceContainer {
  private readonly registrations = new Map<symbol, Registration<unknown>>();
  private readonly order: symbol[] = [];

  register<T>(
    token: ServiceToken<T>,
    factory: Factory<T>,
    dispose?: (instance: T) => void | Promise<void>,
  ): this {
    if (this.registrations.has(token)) {
      throw new Error(`Service already registered: ${token.description ?? 'unknown'}`);
    }
    this.registrations.set(token, {
      factory: factory as Factory<unknown>,
      dispose: dispose as Registration<unknown>['dispose'],
    });
    this.order.push(token);
    return this;
  }

  resolve<T>(token: ServiceToken<T>): T {
    const reg = this.registrations.get(token) as Registration<T> | undefined;
    if (!reg) {
      throw new Error(`Service not registered: ${token.description ?? 'unknown'}`);
    }
    if (reg.instance === undefined) {
      reg.instance = reg.factory(this);
    }
    return reg.instance;
  }

  async dispose(): Promise<void> {
    for (let i = this.order.length - 1; i >= 0; i -= 1) {
      const token = this.order[i];
      if (!token) continue;
      const reg = this.registrations.get(token);
      if (reg?.instance !== undefined && reg.dispose) {
        await reg.dispose(reg.instance);
      }
    }
    this.registrations.clear();
    this.order.length = 0;
  }
}
