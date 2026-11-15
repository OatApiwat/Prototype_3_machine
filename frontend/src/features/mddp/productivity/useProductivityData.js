import { useEffect, useState } from 'react';

const getJson = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(url + ' -> ' + r.status);
  return r.json();
};

/** Run card list and the pieces of the selected run card. Loaded once (and again on `reload()`): this is an analysis view, not a live one. */
export function useProductivityData(rc) {
  const [cards, setCards] = useState(null),
    [parts, setParts] = useState({ rc: null, rows: [] }),
    [error, setError] = useState(null),
    [nonce, setNonce] = useState(0);
  useEffect(() => {
    let dead = false;
    const load = () =>
      getJson('/api/mddp/runcards')
        .then((c) => !dead && (setCards(c.sort((a, b) => a.rc.localeCompare(b.rc))), setError(null)))
        .catch((e) => !dead && setError(String(e.message || e)));
    load();
    return () => {
      dead = true;
    };
  }, [nonce]);
  useEffect(() => {
    if (!rc) return undefined;
    let dead = false;
    const load = () =>
      getJson('/api/mddp/parts?rc=' + encodeURIComponent(rc))
        .then((rows) => !dead && setParts({ rc, rows }))
        .catch((e) => !dead && setError(String(e.message || e)));
    load();
    return () => {
      dead = true;
    };
  }, [rc, nonce]);
  return { cards, parts: parts.rc === rc ? parts.rows : [], error, reload: () => setNonce((n) => n + 1) };
}
