import { useEffect, useState } from 'react';

const read = (key, fallback) => {
  try {
    const v = localStorage.getItem(key);
    return v == null ? fallback : JSON.parse(v);
  } catch {
    return fallback;
  }
};

/** useState whose value is remembered in localStorage (JSON); a blocked or broken storage just falls back to `initial` */
export function usePersistentState(key, initial) {
  const [value, setValue] = useState(() => read(key, typeof initial === 'function' ? initial() : initial));
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage not available: keep working without it */
    }
  }, [key, value]);
  return [value, setValue];
}
