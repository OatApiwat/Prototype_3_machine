import { useEffect, useState } from 'react';

const getJson = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(url + ' -> ' + r.status);
  return r.json();
};

/** Run card list and the pieces of the selected run card, refreshed every `ms` (the backend caches for its poll period). */
export function useProductivityData(rc, ms = 5000) {
  const [cards, setCards] = useState(null),
    [parts, setParts] = useState({ rc: null, rows: [] }),
    [error, setError] = useState(null);
  useEffect(() => {
    let dead = false;
    const load = () =>
      getJson('/api/mddp/runcards')
        .then((c) => !dead && (setCards(c.sort((a, b) => a.rc.localeCompare(b.rc))), setError(null)))
        .catch((e) => !dead && setError(String(e.message || e)));
    load();
    const t = setInterval(load, ms);
    return () => {
      dead = true;
      clearInterval(t);
    };
  }, [ms]);
  useEffect(() => {
    if (!rc) return undefined;
    let dead = false;
    const load = () =>
      getJson('/api/mddp/parts?rc=' + encodeURIComponent(rc))
        .then((rows) => !dead && setParts({ rc, rows }))
        .catch((e) => !dead && setError(String(e.message || e)));
    load();
    const t = setInterval(load, ms);
    return () => {
      dead = true;
      clearInterval(t);
    };
  }, [rc, ms]);
  return { cards, parts: parts.rc === rc ? parts.rows : [], error };
}
