# serotonin-api-docs

Live-verified Lua API reference for the [Serotonin](https://serotonin-1.gitbook.io/serotonin-docs) Roblox cheat. Bilingual EN / RU, deployable to GitHub Pages.

The official Serotonin gitbook has drifted: whole libraries are missing, several signatures are wrong, and known crashers are not flagged. This site is a hand-audit against a real cheat instance. Every function on every page was probed with `pcall` via `verify_all_api.lua`, every error message captured verbatim, every roundtrip confirmed in build `version-390ba09e7e944154` (LuaJIT 2.0.3 sandbox implementing Lua 5.1).

**Live site:** https://deftsolutions-dev.github.io/serotonin-api-docs/

---

## What is in here

```
serotonin-api-docs/
├── docs/                                # English content (markdown)
│   ├── overview.md
│   ├── crash-triggers.md
│   ├── methodology.md
│   ├── llms.md
│   ├── libraries/                       # 14 cheat-side libraries
│   ├── userdata/                        # Instance, Part, Player, Vector3, Color3
│   └── tools/                           # MCP bridge guide
├── i18n/ru/.../current/                 # Russian mirror (same structure)
├── mcp-server/                          # npm package: mcp-serotonin-docs
│   └── src/                             # stdio MCP server, 4 tools
├── src/
│   ├── components/                      # PageActions menu, Logo
│   ├── theme/                           # DocBreadcrumbs / Content swizzles
│   ├── pages/index.tsx                  # Landing
│   └── css/custom.css
├── static/                              # logos + llms.txt + llms-full.md
├── .github/workflows/
│   ├── deploy.yml                       # Pages deploy on push to main
│   └── publish-npm.yml                  # npm publish on tag mcp-v*
├── verify_all_api.lua                   # live API verifier (run in cheat Code Editor)
├── docusaurus.config.ts
├── sidebars.ts
└── package.json
```

Coverage:

| Surface | Count |
|---|---|
| Cheat-side libraries (utility, memory, entity, game, cheat, bit, file, audio, mouse, keyboard, http, websocket, draw, ui) | 14 |
| Userdata (Instance, Part, Player, Vector3, Color3) | 5 |
| Canonical functions + methods | ~150 |
| Alias forms | PascalCase + snake_case for compound names; +lowercase for single-word names |
| Pages (EN + RU) | 38 |

Removed in current build (verified `nil` at runtime):
- `buffer` / `raknet` / `string.buffer` - not bound in LuaJIT 2.0.3 sandbox
- `mouse.SetPosition` / `mouse.GetPosition` - use `game.SilentAim(x, y)` instead
- `http.Patch` / `http.Put` / `http.Delete` - only `Get` and `Post` are bound
- `memory.Read` types `dword`, `qword`, `long`, `longlong`, `int8/16/32`, `uint8/16/32` - 17 type strings actually accepted (see `libraries/memory` for the full list)

---

## Use the docs

### Browser

Open https://deftsolutions-dev.github.io/serotonin-api-docs/ and use the search bar in the top right. Typing `GetTickCount`, `Post`, or any library name jumps you straight to the section that defines it.

Every doc page also has an **Actions** button next to the breadcrumbs:
- **Copy as Markdown** - fetches the raw `.md` and copies it to the clipboard, ready to paste into any chat input.
- **View raw Markdown** - opens the source file on GitHub.
- **Install in VSCode** - one-click install of the `mcp-serotonin-docs` MCP server.
- **Command for Codex** - copies the install command to the clipboard.

### As an MCP server (npm)

The package [`mcp-serotonin-docs`](https://www.npmjs.com/package/mcp-serotonin-docs) ships a stdio MCP server with four tools (`list_pages`, `read_page`, `search_pages`, `get_function`). Add it to any MCP-capable client:

```bash
# VSCode (with the MCP extension)
code --add-mcp '{"name":"serotonin-docs","command":"npx","args":["-y","mcp-serotonin-docs"]}'

# Codex
codex mcp add serotonin-docs -- npx -y mcp-serotonin-docs

# Cursor / Cline / generic - drop into .mcp.json
{
  "mcpServers": {
    "serotonin-docs": {
      "command": "npx",
      "args": ["-y", "mcp-serotonin-docs"]
    }
  }
}
```

`npx` pulls the package once, then the server runs locally on the consumer's machine. Each tool call fetches the relevant raw `.md` from this repo's GitHub Pages site.

### As a single big markdown blob

For one-shot context windows:

```
https://deftsolutions-dev.github.io/serotonin-api-docs/llms-full.md
```

For a [llms.txt](https://llmstxt.org/)-spec index:

```
https://deftsolutions-dev.github.io/serotonin-api-docs/llms.txt
```

See [`docs/llms.md`](https://deftsolutions-dev.github.io/serotonin-api-docs/docs/llms) on the site for a recommended prompt that bakes in every critical convention (PlaySound non-WAV crash, Dropdown numeric index, `Instance:IsA` ClassName-equality semantics, `cheat.LoadString` C++ exception, etc.).

---

## Local development

```bash
git clone https://github.com/DeftSolutions-dev/serotonin-api-docs.git
cd serotonin-api-docs
npm install
npm run start                # English at http://localhost:3000
npm run start -- --locale ru # Russian
```

Hot reload is on. Edit any `.md` under `docs/` (English) or `i18n/ru/docusaurus-plugin-content-docs/current/` (Russian) and the page reloads instantly.

```bash
npm run build       # produce static site under ./build
npm run serve       # preview the built site locally
```

The MCP server is a separate npm workspace under `mcp-server/`:

```bash
cd mcp-server
npm install
npm run build       # tsc to dist/
node dist/index.js  # stdio MCP server, send tools/list to verify
```

---

## Deploy

The repo is configured for GitHub Pages project pages at `https://deftsolutions-dev.github.io/serotonin-api-docs/`. Two workflows are pre-wired:

- `.github/workflows/deploy.yml` - runs on every push to `main`, builds the Docusaurus site, uploads to Pages.
- `.github/workflows/publish-npm.yml` - runs on tags matching `mcp-v*` (e.g. `mcp-v0.1.0`). Builds `mcp-server/` and publishes `mcp-serotonin-docs` to npm with provenance. Requires repo secret `NPM_TOKEN`.

To bump the npm package:

```bash
cd mcp-server
# bump version in package.json
git add package.json
git commit -m "mcp-server: 0.2.0"
git tag mcp-v0.2.0
git push origin main mcp-v0.2.0
```

---

## Methodology

A short summary lives at [`docs/methodology.md`](https://deftsolutions-dev.github.io/serotonin-api-docs/docs/methodology). The short version:

1. Run [`verify_all_api.lua`](./verify_all_api.lua) in the cheat Code Editor - it sweeps every namespace, calls every function with safe arguments, captures every error verbatim, writes a structured log to `C:\Serotonin\files\api_verify_log.txt`.
2. The script also probes legacy/undocumented bindings (`mouse.SetPosition`, `http.Patch/Put/Delete`, `buffer`, `raknet`, full `memory.Read` type list) and reports which are actually bound in the current build.
3. Diff each page against the captured log; whatever the page says must match the live runtime - when they disagree, **live wins** and the page is rewritten.
4. Roundtrip every side-effecting call where it is safe. For dangerous ones (PlaySound non-WAV, LoadString, Click on real game windows), document the signature and skip the call.
5. Mirror everything to Russian.

The result is that every snippet in the docs is something that has been run as written, against the verifier log.

---

## Contributing

Found a function that behaves differently than the page says? Open an issue at https://github.com/DeftSolutions-dev/serotonin-api-docs/issues with:

- the exact function call you ran,
- the runtime build (`memory.GetBase()` and the cheat's About tab help),
- the expected and actual output.

If it is a regression, the page gets re-probed and updated. If it is build-specific, both behaviours go on the page side by side.

---

## License

MIT. See [LICENSE](./LICENSE).

This is an unofficial reference. It is not affiliated with the Serotonin project.
