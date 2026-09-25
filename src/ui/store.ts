import { useSyncExternalStore } from 'react';

/** Minimal external store with selector-based React subscription. */
export interface Store<T> {
  get(): T;
  set(partial: Partial<T> | ((state: T) => Partial<T>)): void;
  subscribe(listener: () => void): () => void;
  use<S>(selector: (state: T) => S): S;
}

export function createStore<T extends object>(initial: T): Store<T> {
  let state = initial;
  const listeners = new Set<() => void>();
  const store: Store<T> = {
    get: () => state,
    set(partial) {
      const next = typeof partial === 'function' ? partial(state) : partial;
      state = { ...state, ...next };
      listeners.forEach((l) => l());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    use: (selector) => useSyncExternalStore(store.subscribe, () => selector(state)),
  };
  return store;
}
