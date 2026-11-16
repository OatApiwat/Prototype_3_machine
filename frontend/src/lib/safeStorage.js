/** localStorage that never throws (blocked storage, private mode, quota): reads give null, writes are ignored */
export const storeGet = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
export const storeSet = (key, value) => {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    /* storage not available */
  }
};
