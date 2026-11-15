import { useEffect, useState } from 'react';

const getJson = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(url.split('?')[0] + ' -> ' + r.status);
  return r.json();
};

/** Analysis data is loaded once per selection (not live): fetch `url` (null = nothing to load) once, and again after reload(); returns [data, error] (data stays [] while loading) */
export function useLoaded(url, nonce) {
  const [res, setRes] = useState({ url: null, data: [], error: null });
  useEffect(() => {
    if (!url) return undefined;
    let dead = false;
    getJson(url)
      .then((data) => !dead && setRes({ url, data, error: null }))
      .catch((e) => !dead && setRes({ url, data: [], error: String(e.message || e) }));
    return () => {
      dead = true;
    };
  }, [url, nonce]);
  return res.url === url ? res : { url, data: [], error: null, loading: !!url };
}

/** several urls loaded together (one entry per url, same order); data stays [] while loading */
export function useLoadedMany(urls, nonce) {
  const key = urls.join('|');
  const [res, setRes] = useState({ key: null, data: [], error: null });
  useEffect(() => {
    if (!key) return undefined;
    let dead = false;
    Promise.all(key.split('|').map(getJson))
      .then((data) => !dead && setRes({ key, data, error: null }))
      .catch((e) => !dead && setRes({ key, data: [], error: String(e.message || e) }));
    return () => {
      dead = true;
    };
  }, [key, nonce]);
  return res.key === key ? res : { key, data: [], error: null, loading: !!key };
}

/** run cards of the dates (YYYY-MM-DD, whole days, end date included); null when the range is empty */
export const cardsUrl = (dateStart, dateEnd) =>
  dateStart <= dateEnd ? `/api/mddp/runcards?dateStart=${dateStart}&dateEnd=${dateEnd}` : null;
export const carriersUrl = (rc) => (rc ? `/api/mddp/carriers?rc=${encodeURIComponent(rc)}` : null);
/** pieces of some strips ("Strip-76", ...) of a run card */
export const partsUrl = (rc, strips) =>
  rc && strips?.length
    ? `/api/mddp/parts?rc=${encodeURIComponent(rc)}&strip=${strips.map(encodeURIComponent).join(',')}`
    : null;
