/**
 * An abstract class for defining a backend for storing the global state.
 * Must support a key-value pair model.
 */
export default abstract class StateBackend<T extends Record<string, unknown>> {
  /** @internal */
  _stateSubs: ((newVal: Partial<T>) => void)[] = []

  /**
   * Gets an item by its key. Preferably uses a caching layer for optimal
   * performance.
   * @param key The key of the item to get
   * @returns The value associated with the given key
   */
  abstract get<K extends keyof T>(key: K): T[K];
  /**
   * Sets the value of a given key
   * @param key The key of the item to set
   * @param value The new value for the provided key
   */
  abstract set<K extends keyof T>(key: K, value: T[K]): void;
}