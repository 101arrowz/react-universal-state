import { StateBackend } from '..';

let id = 0;
const createLSBackend = <T extends Record<string, unknown>>(
  keyName = 'rusGlobalState' + id++
): StateBackend<T> => {
  const gs: T = JSON.parse(localStorage.getItem(keyName) || '{}');
  const persist = (): void => localStorage.setItem(keyName, JSON.stringify(gs));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') persist();
  });

  window.addEventListener('pagehide', () => {
    persist();
  });

  window.addEventListener('beforeunload', () => {
    persist();
  });
  return {
    get(k) {
      return gs[k];
    },
    set(k, v) {
      gs[k] = v;
    }
  };
};

export default createLSBackend;
