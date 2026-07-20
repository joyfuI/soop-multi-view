import type { Accessor } from 'solid-js';
import { createMemo, createSignal, onCleanup, onMount } from 'solid-js';

type CustomStorageEvent = CustomEvent<{ key: string }>;

type StorageSetter<T> = (value: T | ((oldValue: T) => T)) => void;

type StorageResult<T> = readonly [
  value: Accessor<T>,
  setValue: StorageSetter<T>,
  deleteValue: () => void,
];

const createStorage = <T>(
  storage: Storage,
  eventType: string,
  key: string,
  initialValue: T | (() => T),
): StorageResult<T> => {
  const getInitialValue = (): T =>
    typeof initialValue === 'function'
      ? (initialValue as () => T)()
      : initialValue;

  // 문자열 snapshot을 보관해야 같은 값이 저장됐을 때 불필요한 갱신을 막을 수 있다.
  const [item, setItem] = createSignal<string | null>(storage.getItem(key));

  const syncItem = () => {
    setItem(storage.getItem(key));
  };

  const handleStorageEvent = (event: StorageEvent) => {
    if (
      event.storageArea === storage &&
      (event.key === key || event.key === null)
    ) {
      syncItem();
    }
  };

  const handleCustomStorageEvent: EventListener = (event) => {
    const customEvent = event as CustomStorageEvent;

    if (customEvent.detail?.key === key) {
      syncItem();
    }
  };

  onMount(() => {
    window.addEventListener('storage', handleStorageEvent); // 다른 탭
    window.addEventListener(eventType, handleCustomStorageEvent); // 같은 탭
    syncItem(); // 초기 렌더와 mount 사이에 값이 변경됐을 가능성 반영

    onCleanup(() => {
      window.removeEventListener('storage', handleStorageEvent);
      window.removeEventListener(eventType, handleCustomStorageEvent);
    });
  });

  const storedValue = createMemo<T>(() => {
    const currentItem = item();

    if (currentItem === null) {
      return getInitialValue();
    }

    try {
      return JSON.parse(currentItem) as T;
    } catch {
      return getInitialValue();
    }
  });

  const setValue: StorageSetter<T> = (newValue) => {
    const value =
      typeof newValue === 'function'
        ? (newValue as (oldValue: T) => T)(storedValue())
        : newValue;

    const serializedValue = JSON.stringify(value);

    if (serializedValue === undefined) {
      throw new TypeError('스토리지 값은 JSON으로 직렬화할 수 있어야 합니다.');
    }

    storage.setItem(key, serializedValue);

    window.dispatchEvent(
      new CustomEvent<{ key: string }>(eventType, { detail: { key } }),
    );
  };

  const deleteValue = () => {
    storage.removeItem(key);

    window.dispatchEvent(
      new CustomEvent<{ key: string }>(eventType, { detail: { key } }),
    );
  };

  return [storedValue, setValue, deleteValue] as const;
};

/**
 * 로컬 스토리지를 다루는 Solid primitive
 */
export const createLocalStorage = <T>(
  key: string,
  initialValue: T | (() => T),
) => createStorage(window.localStorage, 'localstorage', key, initialValue);

/**
 * 세션 스토리지를 다루는 Solid primitive
 */
export const createSessionStorage = <T>(
  key: string,
  initialValue: T | (() => T),
) => createStorage(window.sessionStorage, 'sessionstorage', key, initialValue);
