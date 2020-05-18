import {
  SetStateAction,
  ComponentType,
  createElement,
  useState,
  Component,
  useEffect
} from 'react';
import { LocalStorageBackend, MemoryBackend } from './persistence';

type GlobalSetState<T> = React.Dispatch<SetStateAction<T>>;
type GlobalStateHookResult<T> = [T, GlobalSetState<T>];
export type GlobalStateHookAll<T> = {
  <K extends keyof T>(key?: K[]): { [k in K]: GlobalStateHookResult<T[k]> };
  <K extends keyof T>(key: K): GlobalStateHookResult<T[K]>;
};
export type GlobalStateHookObject<T> = {
  [K in keyof T]: () => GlobalStateHookResult<T[K]>;
};

/**
 * A hook for global state. These can be obtained via the
 * createGlobalStateHook() method.
 */
export type GlobalStateHook<T> = GlobalStateHookAll<T> &
  GlobalStateHookObject<T>;

/**
 * The properties added via the higher-order components created by the
 * createGlobalStateHOC() method.
 */
export type GlobalStateProps<T> = {
  globalState: Readonly<T>;
  setGlobalState(newState: SetStateAction<Partial<T>>): void;
};

/**
 * A higher-order component for global state. These can be obtained via the
 * createGlobalStateHOC() method.
 */
export type GlobalStateHOC<T> = <
  P extends GlobalStateProps<Pick<T, K>>,
  K extends keyof T
>(
  component: ComponentType<P>,
  key?: K | K[]
) => ComponentType<Omit<P, keyof GlobalStateProps<Pick<T, K>>>>;

/**
 * An abstract class for defining a backend for storing the global state.
 * Must support a key-value pair model.
 */
export abstract class StateBackend<T extends Record<string, unknown>> {
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


const createBackend = <T extends Record<string, unknown>>(
  backend: StateBackend<T> | boolean
): StateBackend<T> => backend === true ? new LocalStorageBackend() : backend || new MemoryBackend();

/**
 * Creates global state hooks supporting all of the given keys
 * @param defaults The keys and corresponding default values for the global state
 * @param persist Either a boolean (whether or not to persist to local storage)
 *                or a custom persistence backend. The backend must be an
 *                object supporting backend.get(key) and
 *                backend.set(key, value).
 * @returns A global hook that supports a string key or array of keys to access
 *          global state for. In addition, the function is an object with an
 *          individual hook for each key. See the examples for more details.
 */
export function createGlobalStateHook<T extends Record<string, unknown>>(
  defaults: T,
  persist: StateBackend<T> | boolean = false
): GlobalStateHook<T> {
  const backend = createBackend(persist);
  const hooks = ({} as unknown) as GlobalStateHookObject<T>;
  for (const k in defaults) {
    if (backend.get(k) === undefined) backend.set(k, defaults[k]);
    hooks[k] = () => {
      const [state, setState] = useState(backend.get(k));
      useEffect(() => {
        const ind = backend._stateSubs.length;
        backend._stateSubs.push(v => {
          if (v.hasOwnProperty(k) && v[k] !== state) {
            setState(v[k]!);
          }
        });
        return () => {
          backend._stateSubs.splice(ind, 1);
        };
      }, []);
      return [
        state,
        val => {
          const newVal = val instanceof Function ? val(state) : val;
          backend.set(k, newVal);
          for (const f of backend._stateSubs)
            f(({ [k]: newVal } as unknown) as Partial<T>);
        }
      ];
    };
  }
  const defaultKeys = Object.keys(defaults);
  return Object.assign((key: keyof T | (keyof T)[] = defaultKeys) => {
    if (Array.isArray(key)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ret = {} as any;
      for (const k of key.sort()) ret[k] = hooks[k]();
      return ret;
    }
    return hooks[key as keyof T]();
  }, hooks);
}

/**
 * Creates global state HOCs supporting all of the given keys
 * @param defaults The keys and corresponding default values for the global state
 * @param persist Either a boolean (whether or not to persist to local storage)
 *                or a custom persistence backend. The backend must be an
 *                object supporting backend.get(key) and
 *                backend.set(key, value).
 * @returns A global higher order component (HOC) that supports a string key or
 *          array of keys to access global state for. Note that the HOC takes
 *          the component to wrap in its first parameter and the optional
 *          keys in its second parameter. See the examples for more details.
 */
export function createGlobalStateHOC<T extends Record<string, unknown>>(
  defaults: T,
  persist: StateBackend<T> | boolean = false
): GlobalStateHOC<T> {
  const backend = createBackend(persist);
  for (const k in defaults)
    if (backend.get(k) === undefined) backend.set(k, defaults[k]);
  const defaultKeys = Object.keys(defaults) as (keyof T)[];
  return <P extends GlobalStateProps<Pick<T, K>>, K extends keyof T>(
    GSC: ComponentType<P>,
    key: K | K[] = defaultKeys as K[]
  ) => {
    const keys = key instanceof Array ? key : [key];
    return class WithGlobalState extends Component<
      Omit<P, keyof GlobalStateProps<Pick<T, K>>>,
      Pick<T, K>
    > {
      static displayName = `WithGlobalState<${keys.join(', ')}>(${GSC.displayName || GSC.name || 'Component'})`;
      private localStateInd: number;
      constructor(props: Omit<P, keyof GlobalStateProps<Pick<T, K>>>) {
        super(props);
        const state = {} as Pick<T, K>;
        for (const k of keys) state[k] = backend.get(k);
        this.state = state;
        this.localStateInd = backend._stateSubs.length;
        backend._stateSubs.push(this.setLocalState);
      }

      setLocalState = ((globalUpdate: Partial<T>) => {
        const newState: Pick<T, K> = this.state;
        let modified = false;
        for (const k in this.state) {
          if (globalUpdate.hasOwnProperty(k)) {
            newState[k] = globalUpdate[k]!;
            modified = true;
          }
        }
        if (modified) this.setState(newState);
      }).bind(this);

      componentWillUnmount(): void {
        backend._stateSubs.splice(this.localStateInd, 1);
      }

      render(): JSX.Element {
        const globalState = this.state;
        return (
          createElement(GSC, {
            ...(this.props as P),
            setGlobalState(newState) {
              const newGlobalState = (newState instanceof Function
                ? newState(globalState)
                : newState) as Partial<T>;
              for (const k in newGlobalState)
                backend.set(k, newGlobalState[k]!);
              for (const f of backend._stateSubs) f(newGlobalState);
            },
            globalState
          })
        );
      }
    }
  };
}

export { LocalStorageBackend, MemoryBackend };
