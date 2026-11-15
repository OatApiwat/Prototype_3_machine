import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * Time-window (zoom) setting of a page, remembered in localStorage.
 * Graphs read the window through `getWin()` so zooming does not re-create their draw loops.
 */
export function useGraphWindow(storageKey, fallback) {
  const [win, setWin] = useState(() => +(localStorage.getItem(storageKey) || fallback));
  const ref = useRef(win);
  useEffect(() => {
    ref.current = win;
    localStorage.setItem(storageKey, win);
  }, [win, storageKey]);
  const getWin = useMemo(() => () => ref.current, []);
  return { win, setWin, getWin };
}
