import { useEffect, useState } from 'react';

export const MACHINE_NO = 'mddp_184';

/** a request = { path, body }: the values asked for go in a JSON payload (POST) */
const post = async ({ path, body }) => {
  const r = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(path + ' -> ' + r.status);
  return r.json();
};
const keyOf = (req) => (req ? JSON.stringify(req) : null);

/** Analysis data is loaded once per selection (not live): fetch `url` (null = nothing to load) once, and again after reload(); returns [data, error] (data stays [] while loading) */
export function useLoaded(req, nonce) {
  const url = keyOf(req);
  const [res, setRes] = useState({ url: null, data: [], error: null });
  useEffect(() => {
    if (!url) return undefined;
    let dead = false;
    post(req)
      .then((data) => !dead && setRes({ url, data, error: null }))
      .catch((e) => !dead && setRes({ url, data: [], error: String(e.message || e) }));
    return () => {
      dead = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the key stands for req
  }, [url, nonce]);
  return res.url === url ? res : { url, data: [], error: null, loading: !!url };
}

/** several urls loaded together (one entry per url, same order); data stays [] while loading */
export function useLoadedMany(reqs, nonce) {
  const key = reqs.some((r) => !r) || !reqs.length ? '' : JSON.stringify(reqs);
  const [res, setRes] = useState({ key: null, data: [], error: null });
  useEffect(() => {
    if (!key) return undefined;
    let dead = false;
    Promise.all(JSON.parse(key).map(post))
      .then((data) => !dead && setRes({ key, data, error: null }))
      .catch((e) => !dead && setRes({ key, data: [], error: String(e.message || e) }));
    return () => {
      dead = true;
    };
  }, [key, nonce]);
  return res.key === key ? res : { key, data: [], error: null, loading: !!key };
}

/** run cards (with their carriers and strip groups) of the dates (YYYY-MM-DD, whole days, end date included); null when the range is empty */
export const cardsUrl = (dateStart, dateEnd) =>
  dateStart <= dateEnd
    ? { path: '/api/mddp_184/runcards', body: { machine_no: MACHINE_NO, dateStart, dateEnd, detail: 1 } }
    : null;
/** pieces of some strips ("Strip-76", ...) of a run card */
export const partsUrl = (rc, strips) =>
  rc && strips?.length ? { path: '/api/mddp_184/parts', body: { machine_no: MACHINE_NO, rc, strips } } : null;
