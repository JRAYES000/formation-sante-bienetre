// Client API — convention naturo-pro : tous les appels passent par apiRequest,
// jamais fetch() brut dans les composants. Query keys hiérarchiques.
import { QueryClient, type QueryFunction } from "@tanstack/react-query";

export async function apiRequest(url: string, options?: RequestInit): Promise<any> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(msg || `HTTP ${res.status}`);
  }
  return res.status === 204 ? null : res.json();
}

export function buildUrl(path: string, params?: Record<string, unknown>): string {
  if (!params) return path;
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "" || v === false) continue;
    sp.set(k, String(v));
  }
  const qs = sp.toString();
  return qs ? `${path}?${qs}` : path;
}

// queryKey = [path, params?] → URL
const defaultQueryFn: QueryFunction = async ({ queryKey }) => {
  const [path, params] = queryKey as [string, Record<string, unknown>?];
  return apiRequest(buildUrl(path, params));
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: defaultQueryFn,
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
