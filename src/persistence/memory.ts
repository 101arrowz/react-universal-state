import { StateBackend } from '..';

const createMemoryBackend = <
  T extends Record<string, unknown>
>(): StateBackend<T> => {
  const gs = {} as T;
  return {
    get(k) {
      return gs[k];
    },
    set(k, v) {
      gs[k] = v;
    }
  };
};

export default createMemoryBackend;
