import { StateBackend } from '.';

class LocalStorageBackend<
  T extends Record<string, unknown>
> extends StateBackend<T> {
  private gs: T;
  private static id = 0;
  constructor(keyName: string = 'rusGlobalState' + LocalStorageBackend.id++) {
    super();
    this.gs = JSON.parse(localStorage.getItem(keyName) || '{}');
    const persist = (): void =>
      localStorage.setItem(keyName, JSON.stringify(this.gs));
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') persist();
    });

    window.addEventListener('pagehide', () => {
      persist();
    });

    window.addEventListener('beforeunload', () => {
      persist();
    });
  }

  get<K extends keyof T>(k: K): T[K] {
    return this.gs[k];
  }

  set<K extends keyof T>(k: K, v: T[K]): void {
    this.gs[k] = v;
  }
}

export default LocalStorageBackend;
