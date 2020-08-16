/**
 * An abstract class for defining a backend for storing the global state.
 * Must support a key-value pair model.
 */
export default interface StateBackend<T extends Record<string, unknown>> {
  /**
   * Gets an item by its key. Preferably uses a caching layer for optimal
   * performance.
   * @param key The key of the item to get
   * @returns The value associated with the given key
   */
  get<K extends keyof T>(key: K): T[K] | undefined;
  /**
   * Sets the value of a given key
   * @param key The key of the item to set
   * @param value The new value for the provided key
   */
  set<K extends keyof T>(key: K, value: T[K]): void;
}
