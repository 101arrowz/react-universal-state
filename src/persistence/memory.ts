import { StateBackend } from '.';

class MemoryBackend<T extends Record<string, unknown>> extends StateBackend<T> {
  private gs: T = {} as T;

  get<K extends keyof T>(k: K): T[K] {
    return this.gs[k];
  }

  set<K extends keyof T>(k: K, v: T[K]): void {
    this.gs[k] = v;
  }
}

export default MemoryBackend;
