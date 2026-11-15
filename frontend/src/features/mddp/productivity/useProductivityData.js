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

export const cardsUrl = (from, to) => (from < to ? `/api/mddp/runcards?from=${from}&to=${to}` : null);
export const carriersUrl = (rc) => (rc ? `/api/mddp/carriers?rc=${encodeURIComponent(rc)}` : null);
export const partsUrl = (rc, seq) =>
  rc && seq ? `/api/mddp/parts?rc=${encodeURIComponent(rc)}&seq=${seq}` : null;
