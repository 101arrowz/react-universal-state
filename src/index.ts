import {
  SetStateAction,
  ComponentType,
  createElement,
  useState,
  Component,
  useEffect,
  useRef
} from 'react';
import { LocalStorageBackend, MemoryBackend, StateBackend } from './persistence';

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

function createBackend<T extends Record<string, unknown>>(
  backend: StateBackend<T> | boolean
): StateBackend<T> {
  if (!backend)
    return new MemoryBackend();
  if (backend === true)
    return new LocalStorageBackend();
  else
    return backend;
}

/**
 * Creates a state store, along with a hook and HOC to access it
 * @param defaults The keys and corresponding default values for the global state
 * @param persist Either a boolean (whether or not to persist to local storage)
 *                or a custom persistence backend. The backend must be an
 *                object supporting backend.get(key) and
 *                backend.set(key, value).
 * @returns A global hook and HOC, both of which support a string key or array
 *          of keys to access global state for.
 */
export default function createState<T extends Record<string, unknown>>(defaults: T, persist: StateBackend<T> | boolean = false): { hook: GlobalStateHook<T>; hoc: GlobalStateHOC<T> } {
  const backend = createBackend(persist);
  const defaultKeys: (keyof T)[] = Object.keys(defaults);
  const stateSubs = new Set<(newVal: Partial<T>) => void>();
  for (const k of defaultKeys) {
    if (backend.get(k) === undefined)
      backend.set(k, defaults[k]);
  }
  const hooks = ({} as unknown) as GlobalStateHookObject<T>;
  for (const k in defaults) {
    hooks[k] = () => {
      const [state, setState] = useState(backend.get(k));
      const curState = useRef(state!);
      useEffect(() => {
        const cb = (v: Partial<T>) => {
          if (v.hasOwnProperty(k)) {
            curState.current = v[k]!;
            setState(v[k]!);
          }
        };
        stateSubs.add(cb);
        return () => {
          stateSubs.delete(cb);
        };
      });
      return [
        state!,
        val => {
          const newVal = typeof val === 'function' ? (val as (a: typeof state) => typeof state)(curState.current) : val;
          curState.current = newVal!;
          backend.set(k, newVal!);
          for (const f of stateSubs)
            f(({ [k]: newVal } as unknown) as Partial<T>);
        }
      ];
    };
  }
  const hook = Object.assign((key: keyof T | (keyof T)[] = defaultKeys) => {
    if (Array.isArray(key)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ret = {} as any;
      for (const k of key.sort()) ret[k] = hooks[k]();
      return ret;
    }
    return hooks[key as keyof T]();
  }, hooks);
  const hoc = <P extends GlobalStateProps<Pick<T, K>>, K extends keyof T>(
    GSC: ComponentType<P>,
    key: K | K[] = defaultKeys as K[]
  ) => {
    const keys = Array.isArray(key) ? key : [key];
    return class WithGlobalState extends Component<
      Omit<P, keyof GlobalStateProps<Pick<T, K>>>,
      Pick<T, K>
    > {
      static displayName = `WithGlobalState<${keys.join(', ')}>(${GSC.displayName || GSC.name || 'Component'})`;
      constructor(props: Omit<P, keyof GlobalStateProps<Pick<T, K>>>) {
        super(props);
        const state = {} as Pick<T, K>;
        for (const k of keys) state[k] = backend.get(k)!;
        this.state = state;
      }

      componentDidMount() {
        stateSubs.add(this.setLocalState);
      }

      setLocalState = ((globalUpdate: Partial<T>) => {
        let modified = false;
        const localUpdate: Partial<Pick<T, K>> = {};
        for (const k of keys) {
          if (globalUpdate.hasOwnProperty(k) && globalUpdate[k] !== this.state[k]) {
            localUpdate[k] = globalUpdate[k];
            (this.state as Pick<T, K>)[k] = globalUpdate[k]!;
            modified = true;
          }
        }
        if (modified) this.setState(localUpdate as Pick<T, K>);
      }).bind(this);

      componentWillUnmount(): void {
        stateSubs.delete(this.setLocalState);
      }

      render(): JSX.Element {
        const prevState: Pick<T, K> = this.state;
        return (
          createElement(GSC, {
            ...(this.props as P),
            setGlobalState(newState) {
              const newGlobalState = (typeof newState === 'function'
                ? newState(prevState)
                : newState) as Partial<T>;
              const targetUpdate: Partial<Pick<T, K>> = {};
              if (newGlobalState != null) {
                for (const k of keys) {
                  if (newGlobalState.hasOwnProperty(k))
                    targetUpdate[k] = newGlobalState[k];
                }
              }
              for (const k in targetUpdate) {
                backend.set(k, targetUpdate[k]!);
                prevState[k] = targetUpdate[k]!;
              }
              for (const f of stateSubs) f(targetUpdate as Partial<T>);
            },
            globalState: prevState
          })
        );
      }
    }
  }
  return { hook, hoc };
}

export { StateBackend, LocalStorageBackend, MemoryBackend };
