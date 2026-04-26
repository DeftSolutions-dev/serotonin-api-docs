import { pageUrl, type Locale } from "./pages.js";

interface CacheEntry {
    body: string;
    expiresAt: number;
}

const CACHE = new Map<string, CacheEntry>();
const TTL_MS = 5 * 60 * 1000;   // 5 minutes
const MAX_BODY = 1_500_000;     // 1.5 MB ceiling per page (defensive)

export async function fetchPage(slug: string, locale: Locale = "en"): Promise<string> {
    const url = pageUrl(slug, locale);
    const now = Date.now();

    const hit = CACHE.get(url);
    if (hit && hit.expiresAt > now) return hit.body;

    const res = await fetch(url, {
        headers: {
            "User-Agent": "mcp-serotonin-docs",
            "Accept":     "text/plain, text/markdown, */*",
        },
    });
    if (!res.ok) {
        throw new Error(`Failed to fetch ${slug} (${locale}): HTTP ${res.status} ${res.statusText}`);
    }

    const body = await res.text();
    if (body.length > MAX_BODY) {
        throw new Error(`Page ${slug} (${locale}) exceeds size limit (${body.length} bytes)`);
    }

    CACHE.set(url, { body, expiresAt: now + TTL_MS });
    return body;
}

export function clearCache(): void {
    CACHE.clear();
}
