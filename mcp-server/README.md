# mcp-serotonin-docs

[![npm](https://img.shields.io/npm/v/mcp-serotonin-docs?logo=npm)](https://www.npmjs.com/package/mcp-serotonin-docs)
[![license](https://img.shields.io/npm/l/mcp-serotonin-docs)](https://github.com/DeftSolutions-dev/serotonin-api-docs/blob/main/LICENSE)

Stdio MCP server that exposes the live-verified [Serotonin Lua API reference](https://deftsolutions-dev.github.io/serotonin-api-docs/) as tools any MCP-capable agent (Codex, Cursor, Cline, VSCode) can call.

The reference covers **14 cheat-side libraries** (utility, memory, entity, game, cheat, bit, file, audio, mouse, keyboard, http, websocket, draw, ui) plus **5 userdata types** (Instance, Part, Player, Vector3, Color3). Every signature has been roundtripped against the live runtime in build `version-390ba09e7e944154` (LuaJIT 2.0.3 sandbox implementing Lua 5.1). The legacy `buffer` and `raknet` libraries are not bound in the current build and have been removed from the index. This package ships the page index baked-in and fetches the actual page bodies from the project's GitHub Pages site at request time.

## Tools

| Tool | Inputs | Output |
|---|---|---|
| `list_pages`    | `locale?` (`"en"` / `"ru"`) | Array of `{slug, title, section}` records for every doc page |
| `read_page`     | `slug`, `locale?` | Full markdown body of one page |
| `search_pages`  | `query`, `locale?` | Pages whose title or body matches the query, with a short snippet around the hit |
| `get_function`  | `library`, `name`, `locale?` | Just the `## \`name\`` section from a library page (e.g. `memory.Read`, `ui.SetValue`) |

## Install

This package is run via `npx`, no install step needed. Add it to your MCP client's config:

### VSCode (with MCP extension)

```bash
code --add-mcp '{"name":"serotonin-docs","command":"npx","args":["-y","mcp-serotonin-docs"]}'
```

Or click the **Install in VSCode** button on any page of the [docs site](https://deftsolutions-dev.github.io/serotonin-api-docs/).

### Codex

```bash
codex mcp add serotonin-docs -- npx -y mcp-serotonin-docs
```

### Cursor / Cline / generic MCP client

Add to your MCP config JSON (`.mcp.json`, `~/.cursor/mcp.json`, etc.):

```json
{
  "mcpServers": {
    "serotonin-docs": {
      "command": "npx",
      "args": ["-y", "mcp-serotonin-docs"]
    }
  }
}
```

## Usage from an agent

Once attached, the agent has four tools available. Typical flow:

1. Call `search_pages({ query: "PlaySound" })` to find the page.
2. Call `get_function({ library: "audio", name: "PlaySound" })` to read just that function's section.
3. Or `read_page({ slug: "libraries/audio" })` for the whole page.

Russian locale: pass `{ locale: "ru" }` to any tool.

## How it works

```
MCP client (VSCode / Codex / Cursor / Cline)
    │  stdio MCP
    ▼
npx -y mcp-serotonin-docs   <- this package
    │  HTTP fetch (cached 5 min)
    ▼
raw.githubusercontent.com/DeftSolutions-dev/serotonin-api-docs/main/docs/*.md
```

No remote MCP server, no infrastructure to host. The page index is hardcoded into the package; bumping the docs structure means publishing a new version of `mcp-serotonin-docs`.

## Development

```bash
git clone https://github.com/DeftSolutions-dev/serotonin-api-docs.git
cd serotonin-api-docs/mcp-server
npm install
npm run build
node dist/index.js   # speaks stdio MCP
```

The package is published from the `mcp-server/` subdirectory of the [serotonin-api-docs](https://github.com/DeftSolutions-dev/serotonin-api-docs) repo via GitHub Actions on git tags matching `mcp-v*` (e.g. `mcp-v0.1.0`).

## License

MIT.
