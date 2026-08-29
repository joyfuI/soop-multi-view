import { createMemo, createSignal, onCleanup, onMount } from 'solid-js';

type StorageEventType = 'localstorage' | 'sessionstorage';
type CustomStorageEvent = CustomEvent<{ key: string }>;

declare global {
  interface WindowEventMap {
    localstorage: CustomStorageEvent;
    sessionstorage: CustomStorageEvent;
  }
}

const createStorage = <T>(
  storage: Storage,
  eventType: StorageEventType,
  key: string,
  initialValue: T | (() => T),
) => {
  const [item, setItem] = createSignal(storage.getItem(key));

  const syncItem = () => {
    setItem(storage.getItem(key));
  };

  const handleStorageEvent = (event: StorageEvent | CustomStorageEvent) => {
    if (event instanceof StorageEvent) {
      if (
        event.storageArea === storage &&
        (event.key === key || event.key === null)
      ) {
        syncItem();
      }
    } else if (event instanceof CustomEvent) {
      if (event.detail.key === key) {
        syncItem();
      }
    }
  };

  onMount(() => {
    window.addEventListener('storage', handleStorageEvent); // 다른 탭
    window.addEventListener(eventType, handleStorageEvent); // 같은 탭
    onCleanup(() => {
      window.removeEventListener('storage', handleStorageEvent);
      window.removeEventListener(eventType, handleStorageEvent);
    });
  });

  const getInitialValue = (): T =>
    typeof initialValue === 'function'
      ? (initialValue as () => T)()
      : initialValue;

  const storedValue = createMemo<T>(() => {
    const currentItem = item();
    try {
      return currentItem !== null
        ? (JSON.parse(currentItem) as T)
        : getInitialValue();
    } catch {
      return getInitialValue();
    }
  });

  const setValue = (newValue: T | ((oldValue: T) => T)) => {
    const value =
      typeof newValue === 'function'
        ? (newValue as (oldValue: T) => T)(storedValue())
        : newValue;
    storage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent(eventType, { detail: { key } })); // 커스텀 이벤트 발생
  };

  const deleteValue = () => {
    storage.removeItem(key);
    window.dispatchEvent(new CustomEvent(eventType, { detail: { key } })); // 커스텀 이벤트 발생
  };

  return [storedValue, setValue, deleteValue] as const;
};

/**
 * 로컬 스토리지를 다루는 프리미티브
 * @param key 로컬스토리지에 저장할 키
 * @param initialValue 값이 없을 때 사용할 기본값
 * @returns [저장된 값 함수, 변경 함수, 삭제 함수]
 */
export const createLocalStorage = <T>(
  key: string,
  initialValue: T | (() => T),
) => createStorage(window.localStorage, 'localstorage', key, initialValue);

/**
 * 세션 스토리지를 다루는 프리미티브
 * @param key 세션스토리지에 저장할 키
 * @param initialValue 값이 없을 때 사용할 기본값
 * @returns [저장된 값 함수, 변경 함수, 삭제 함수]
 */
export const createSessionStorage = <T>(
  key: string,
  initialValue: T | (() => T),
) => createStorage(window.sessionStorage, 'sessionstorage', key, initialValue);
