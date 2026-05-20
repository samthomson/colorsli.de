import { useState, useEffect } from 'react';

type Serializer<T> = {
  serialize: (value: T) => string;
  deserialize: (value: string) => T;
};

function createStorageHook(storage: Storage, eventName: string) {
  return function useStorage<T>(
    key: string,
    defaultValue: T,
    serializer?: Serializer<T>,
  ) {
    const serialize = serializer?.serialize || JSON.stringify;
    const deserialize = serializer?.deserialize || JSON.parse;

    const [state, setState] = useState<T>(() => {
      try {
        const item = storage.getItem(key);
        return item ? deserialize(item) : defaultValue;
      } catch {
        return defaultValue;
      }
    });

    const setValue = (value: T | ((prev: T) => T)) => {
      try {
        setState((prev) => {
          const valueToStore = value instanceof Function ? value(prev) : value;
          const serialized = serialize(valueToStore);
          storage.setItem(key, serialized);
          window.dispatchEvent(
            new CustomEvent(eventName, { detail: { key, serialized } }),
          );
          return valueToStore;
        });
      } catch {
        // no-op
      }
    };

    useEffect(() => {
      const handleStorageChange = (e: StorageEvent) => {
        if (e.storageArea !== storage || e.key !== key || e.newValue === null) return;
        try {
          setState(deserialize(e.newValue));
        } catch {
          // no-op
        }
      };
      const handleCustomEvent = (e: Event) => {
        const detail = (e as CustomEvent<{ key: string; serialized: string }>).detail;
        if (!detail || detail.key !== key) return;
        try {
          setState(deserialize(detail.serialized));
        } catch {
          // no-op
        }
      };

      window.addEventListener('storage', handleStorageChange);
      window.addEventListener(eventName, handleCustomEvent);
      return () => {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener(eventName, handleCustomEvent);
      };
    }, [key, deserialize]);

    return [state, setValue] as const;
  };
}

export const useLocalStorage = createStorageHook(localStorage, 'colorslide:local-storage');
export const useSessionStorage = createStorageHook(sessionStorage, 'colorslide:session-storage');