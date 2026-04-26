export type Locale = "en" | "ru";

export interface PageEntry {
    /** Path component under docs/ (no .md extension). */
    slug: string;
    /** Human-readable title in English (used for search and listing). */
    title: string;
    /** Section grouping for filtering. */
    section: "foundation" | "library" | "userdata" | "tool";
}

export const PAGES: PageEntry[] = [
    // Foundation
    { slug: "overview",        title: "Overview",                   section: "foundation" },
    { slug: "crash-triggers",  title: "Crash triggers",             section: "foundation" },
    { slug: "methodology",     title: "Methodology",                section: "foundation" },
    { slug: "llms",            title: "For LLMs (llms.txt)",        section: "foundation" },

    // Libraries (14 — buffer and raknet removed: not bound in current build)
    { slug: "libraries/utility",   title: "utility",   section: "library" },
    { slug: "libraries/memory",    title: "memory",    section: "library" },
    { slug: "libraries/entity",    title: "entity",    section: "library" },
    { slug: "libraries/game",      title: "game",      section: "library" },
    { slug: "libraries/cheat",     title: "cheat",     section: "library" },
    { slug: "libraries/bit",       title: "bit",       section: "library" },
    { slug: "libraries/file",      title: "file",      section: "library" },
    { slug: "libraries/audio",     title: "audio",     section: "library" },
    { slug: "libraries/mouse",     title: "mouse",     section: "library" },
    { slug: "libraries/keyboard",  title: "keyboard",  section: "library" },
    { slug: "libraries/http",      title: "http",      section: "library" },
    { slug: "libraries/websocket", title: "websocket", section: "library" },
    { slug: "libraries/draw",      title: "draw",      section: "library" },
    { slug: "libraries/ui",        title: "ui",        section: "library" },

    // Userdata (5)
    { slug: "userdata/Instance", title: "Instance", section: "userdata" },
    { slug: "userdata/Part",     title: "Part",     section: "userdata" },
    { slug: "userdata/Player",   title: "Player",   section: "userdata" },
    { slug: "userdata/Vector3",  title: "Vector3",  section: "userdata" },
    { slug: "userdata/Color3",   title: "Color3",   section: "userdata" },

    // Tools
    { slug: "tools/mcp-bridge", title: "MCP Bridge", section: "tool" },
];

export function pageUrl(slug: string, locale: Locale = "en"): string {
    const base = "https://raw.githubusercontent.com/DeftSolutions-dev/serotonin-api-docs/main";
    return locale === "ru"
        ? `${base}/i18n/ru/docusaurus-plugin-content-docs/current/${slug}.md`
        : `${base}/docs/${slug}.md`;
}
