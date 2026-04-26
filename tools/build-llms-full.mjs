import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = resolve(__dirname, '..');
const DOCS_DIR  = resolve(ROOT, 'docs');
const OUT_FILE  = resolve(ROOT, 'static/llms-full.md');

const ORDER = [
  'overview.md',
  'crash-triggers.md',
  'methodology.md',
  'llms.md',
  'libraries/utility.md',
  'libraries/memory.md',
  'libraries/entity.md',
  'libraries/game.md',
  'libraries/cheat.md',
  'libraries/bit.md',
  'libraries/buffer.md',
  'libraries/file.md',
  'libraries/audio.md',
  'libraries/mouse.md',
  'libraries/keyboard.md',
  'libraries/http.md',
  'libraries/websocket.md',
  'libraries/draw.md',
  'libraries/ui.md',
  'libraries/raknet.md',
  'userdata/Vector3.md',
  'userdata/Color3.md',
  'tools/api-dump-script.md',
  'tools/mcp-bridge.md',
];

function listAll(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...listAll(full));
    else if (full.endsWith('.md') || full.endsWith('.mdx')) out.push(full);
  }
  return out;
}

function stripFrontmatter(text) {
  if (!text.startsWith('---\n')) return text;
  const end = text.indexOf('\n---', 4);
  if (end === -1) return text;
  return text.slice(end + 4).replace(/^\n+/, '');
}

function relPath(full) {
  return full.replace(DOCS_DIR + '\\', '').replace(DOCS_DIR + '/', '').replace(/\\/g, '/');
}

const all = listAll(DOCS_DIR);
const allRel = new Set(all.map(relPath));
const seen = new Set();
const ordered = [];

for (const rel of ORDER) {
  if (allRel.has(rel)) {
    ordered.push(rel);
    seen.add(rel);
  }
}
for (const rel of allRel) {
  if (!seen.has(rel)) ordered.push(rel);
}

const header = `# Serotonin Lua API — Full Reference

> Single-blob concatenation of every page on https://deftsolutions-dev.github.io/serotonin-api-docs/.
> Generated from build version-390ba09e7e944154, audited 2026-04-26.
> 17 cheat-side libraries + Vector3 / Color3 userdata. Every signature pcall-probed against the live runtime.

Drop the entire contents below into one LLM context window for instant grounding on the Serotonin Lua sandbox.

---
`;

const parts = [header];
for (const rel of ordered) {
  const full = join(DOCS_DIR, rel);
  const raw  = readFileSync(full, 'utf-8');
  const body = stripFrontmatter(raw).trim();
  parts.push(`\n\n<!-- ===== ${rel} ===== -->\n\n${body}\n`);
}

writeFileSync(OUT_FILE, parts.join(''), 'utf-8');

const sizeKB = (Buffer.byteLength(parts.join(''), 'utf-8') / 1024).toFixed(1);
console.log(`[OK] ${OUT_FILE}`);
console.log(`     ${ordered.length} pages, ${sizeKB} KB`);
