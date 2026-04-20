import { useState, useEffect } from 'react';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function readCache(query: string): string | null {
  try {
    const raw = localStorage.getItem(`unsplash:${query}`);
    if (!raw) return null;
    const { url, ts } = JSON.parse(raw) as { url: string; ts: number };
    return Date.now() - ts < CACHE_TTL_MS ? url : null;
  } catch {
    return null;
  }
}

function writeCache(query: string, url: string) {
  try {
    localStorage.setItem(`unsplash:${query}`, JSON.stringify({ url, ts: Date.now() }));
  } catch {}
}

const inFlight = new Map<string, Promise<string | null>>();

function fetchPhoto(query: string): Promise<string | null> {
  if (inFlight.has(query)) return inFlight.get(query)!;
  const key = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;
  if (!key) return Promise.resolve(null);
  const promise = fetch(
    `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&orientation=landscape&client_id=${key}`
  )
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => (data?.urls?.regular as string) ?? null)
    .catch(() => null)
    .finally(() => inFlight.delete(query));
  inFlight.set(query, promise);
  return promise;
}

export function useUnsplashImage(query: string): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!query) return;
    const cached = readCache(query);
    if (cached) { setUrl(cached); return; }
    let alive = true;
    fetchPhoto(query).then((imgUrl) => {
      if (!alive || !imgUrl) return;
      writeCache(query, imgUrl);
      setUrl(imgUrl);
    });
    return () => { alive = false; };
  }, [query]);

  return url;
}
