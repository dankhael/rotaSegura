import { useEffect, useState } from "react";

type MapResourceState<T> = { items: T[]; hasError: boolean };

/**
 * Busca um recurso paginado da API (envelope `{ data }`) para camadas do mapa.
 * Valida o shape (resposta de erro vira lista vazia em vez de quebrar o `.map`),
 * cancela em unmount — o StrictMode dispara o effect duas vezes em dev — e expõe
 * `hasError` para a UI avisar em vez de mostrar mapa vazio silencioso.
 *
 * @example
 *   const { items, hasError } = useMapResource<Occurrence>("/api/occurrences?limit=100");
 */
export function useMapResource<T>(path: string): MapResourceState<T> {
  const [items, setItems] = useState<T[]>([]);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch(path, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((body) => setItems(body.data ?? []))
      .catch((err: unknown) => {
        if (!(err instanceof Error) || err.name !== "AbortError") setHasError(true);
      });
    return () => controller.abort();
  }, [path]);

  return { items, hasError };
}
