"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Status = "loading" | "error" | "ready";

/**
 * Padroniza fetch com loading/erro/retry.
 * `fetcher` deve retornar os dados já no formato final (ex: array, objeto).
 * `deps` reexecuta o fetch quando mudar (padrão: só na montagem).
 */
export function useAsyncData<T>(
  fetcher: () => Promise<T>,
  deps: React.DependencyList = []
) {
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const load = useCallback(() => {
    setStatus("loading");
    fetcherRef.current()
      .then((result) => {
        setData(result);
        setStatus("ready");
      })
      .catch(() => {
        setStatus("error");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { load(); }, [load]);

  return { data, status, reload: load };
}