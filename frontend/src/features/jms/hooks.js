import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage } from "./api";

/**
 * Load data from the journal service.
 *   const { data, loading, error, reload } = useLoad(() => get("/author/fees"), []);
 * `body` is the response's data field by default (use raw: true for the whole body).
 */
export function useLoad(fetcher, deps = [], { raw = false } = {}) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const fetchRef = useRef(fetcher);
  fetchRef.current = fetcher;

  const run = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const body = await fetchRef.current();
      setState({ data: raw ? body : body?.data ?? null, loading: false, error: null });
    } catch (e) {
      setState({ data: null, loading: false, error: errorMessage(e) });
    }
  }, [raw]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    run();
  }, [run, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps

  return { ...state, reload: run };
}

/** Debounce a fast-changing value (search boxes). */
export function useDebounced(value, delay = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}
