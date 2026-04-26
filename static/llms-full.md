# Serotonin Lua API — Full Reference

> Single-blob concatenation of every page on https://deftsolutions-dev.github.io/serotonin-api-docs/.
> Generated from build version-390ba09e7e944154, audited 2026-04-26.
> 17 cheat-side libraries + Vector3 / Color3 userdata. Every signature pcall-probed against the live runtime.

Drop the entire contents below into one LLM context window for instant grounding on the Serotonin Lua sandbox.

---


<!-- ===== overview.md ===== -->

---
sidebar_position: 1
title: Overview
---

# Overview

Serotonin runs scripts on a sandboxed **LuaJIT 2.0.3** core (which implements Lua 5.1), with the LuaJIT-specific globals stripped. `_VERSION` reports `"Lua 5.1"` because that is the language version LuaJIT 2.0.3 implements. `jit`, `ffi`, `os`, `io`, `debug` are stripped from the sandbox. `string.buffer` and the `buffer` table are **not** present - that API only landed in LuaJIT 2.1, while this build is on the older 2.0.3. The BitOp `bit` library is exposed (`band`, `bor`, `bxor`, `bnot`, `lshift`, `rshift`, `arshift`, `rol`, `ror`, `bswap`, `tobit`, `tohex`) - verified live. Scripts go in `C:\Serotonin\scripts\*.lua` and are loaded via the **Scripting** tab. Files written by scripts via the `file` library land in `C:\Serotonin\files\` (sandboxed).

## Lifecycle

A script registers callbacks via `cheat.Register(event, fn)`. Available events:

| Event | Frequency (verified live) | Use for |
|---|---|---|
| `onUpdate` | ~10 ms (~95–100 Hz) cache thread | Logic, polling cached state |
| `onSlowUpdate` | exactly 1 s | Background tasks, timers |
| `paint` (alias `onPaint`) | per frame, ~60–250 Hz depending on display & cheat load; fires regardless of overlay focus | Drawing, required for any `draw.*` call |
| `shutdown` | once on unload | Cleanup |
| `newPlace` | place change | Reset state when teleporting |

Both `paint` and `onPaint` aliases dispatch to the same per-frame slot - registering callbacks under both names doubles the callback rate (verified: 2 handlers → 2 calls per frame).

Note: `cheat.Register` does **no validation** on the event name string - passing an unknown name (or a number) is silently accepted. Only the five names above are actually dispatched.

```lua
cheat.register("onPaint", function()
    draw.TextOutlined("hello", 20, 20, Color3.fromRGB(255, 255, 255), "Verdana")
end)
```

## Naming convention

Verified live by sweeping all 177 documented functions, userdata methods, and statics across **five** case-styles: PascalCase, camelCase, snake_case, full-lowercase, and SCREAMING_SNAKE_CASE.

**Aggregate result (177 entries probed):**

| Style | Bound | Notes |
|---|---|---|
| **PascalCase** (`GetTickCount`)         | 164 / 177 | The default. The only library where PC is **not** bound is `file` (see below). |
| **camelCase** (`getTickCount`)          | 169 / 177 | The most universally accepted form. Always paired with PascalCase. |
| **snake_case** (`get_tick_count`)       | 163 / 177 | Almost always bound for normal compound names. Breaks on multi-letter abbreviations (see edge cases below). |
| **lowercase** (`gettickcount`)          | 79 / 177  | Only single-word names + the `file` library + a handful of "compound-looking-but-treated-as-one-word" names. |
| **SCREAMING_SNAKE_CASE** (`GET_TICK_COUNT`) | 0 / 177 | **Never bound anywhere.** |

**The general rule:** for a normal compound name like `GetTickCount`, the cheat binds **PascalCase + camelCase + snake_case** (3 forms). Single-word names like `Read` collapse to **PascalCase + lowercase** (2 effective forms — for them lowercase = camelCase = snake_case).

| PascalCase | camelCase | snake_case |
|---|---|---|
| `utility.GetTickCount`        | `utility.getTickCount`        | `utility.get_tick_count` |
| `entity.GetPlayers`           | `entity.getPlayers`           | `entity.get_players` |
| `ui.NewCheckbox`              | `ui.newCheckbox`              | `ui.new_checkbox` |
| `draw.RectFilled`             | `draw.rectFilled`             | `draw.rect_filled` |
| `instance:FindFirstChild`     | `instance:findFirstChild`     | `instance:find_first_child` |
| `instance:GetAttributes`      | `instance:getAttributes`      | `instance:get_attributes` |
| `player:GetBonePosition`      | `player:getBonePosition`      | `player:get_bone_position` |

### Edge cases (verified live)

These deviate from the general rule. When in doubt, default to PascalCase:

- **`file` library is lowercase-canonical.** `file.read`, `file.write`, `file.append`, `file.listdir`, `file.exists`, `file.isdir`, `file.mkdir`, `file.delete` — these are the canonical names. PascalCase variants (`file.Read`, `file.Write`, `file.Append`, `file.Exists`, `file.Delete`) are **not bound**, but they are exposed under the **lowercase form only** (and `Read`/`Write`/`Append`/`Exists`/`Delete` also have camelCase + snake_case forms).
- **`file.ListDir` / `IsDir` / `MkDir`** are bound **only** as `file.listdir` / `file.isdir` / `file.mkdir` (treated as single words by the cheat). The camelCase (`listDir`) and snake_case (`list_dir`) forms are **not bound**.
- **Multi-letter abbreviations like `RGB`, `HSV`, `FFlag`** survive only through PascalCase and camelCase. The snake_case form that would split each capital (`from_r_g_b`, `to_h_s_v`, `set_f_flag`) is **not bound**:
  - `Color3.fromRGB` / `Color3.fromHSV` / `Color3:ToHSV` exist at PascalCase + camelCase only.
  - `game.SetFFlag` / `game.GetFFlag` exist at PascalCase + camelCase only.
- **`Vector3.zero` / `.one` / `.xAxis` / `.yAxis` / `.zAxis`** are pre-allocated `Vector3` userdata properties, not functions. They live at exactly the names listed (PascalCase / camelCase as written) — they have no aliases because they are values, not callables.
- **SCREAMING_SNAKE_CASE is never bound** anywhere. 0 of 177 probes returned a function under the screaming form.

This documentation uses **PascalCase** as canonical for cheat-side libraries (and **lowercase** for `file`). Use whichever style matches your codebase, but never reach for SCREAMING_SNAKE_CASE — it does not exist on any function.

:::info Aliases are not the same Lua function object
Verified live: `cheat.Register == cheat.register` returns `false`, even though both call the same C function and behave identically. Each alias form is registered as a distinct Lua callable wrapping the same native handler. Do not use `==` to test whether a value is a specific API function, compare names instead.
:::

## Sandbox surface

### Available globals

```
ui  string  mouse  http  table  type  next  pairs  ipairs  getmetatable  setmetatable
getfenv  setfenv  rawget  rawset  rawequal  unpack  select  tonumber  tostring  error
pcall  xpcall  loadfile  load  loadstring  dofile  gcinfo  collectgarbage  newproxy
print  _VERSION  coroutine  package  entity  websocket  audio  memory
file  keyboard  Color3  math  game  cheat  bit  draw  utility  Vector3  module  assert
require
```

### Confirmed missing (return nil)

```
_G  _ENV  workspace  shared  typeof  tick  time  delay  spawn  wait  task  script
Instance  Enum  CFrame  Vector2  UDim  UDim2  Rect  TweenInfo  Region3  Ray  BrickColor
NumberRange  NumberSequence  ColorSequence  PhysicalProperties  Axes  Faces
os  io  debug  bit32  utf8  rawlen  jit  ffi  buffer  raknet  string.buffer
```

`buffer` and `raknet` were exposed in some earlier builds but are **not bound in the current build** (verified live: `type(buffer) == "nil"`, `type(raknet) == "nil"`). Their doc pages have been removed - there is nothing usable to document.

Use `getfenv(1)` to get the current environment table.

## Userdata vs table

- **Tables**: every API library (`utility`, `memory`, `entity`, ...) is a Lua table you index with `.`.
- **Userdata**: returned by API calls (`Vector3`, `Color3`, Roblox `Instance`, `entity.GetPlayers()` players, parts from `entity.GetParts()`). Methods on userdata are called with `:` and live in the `metatable`.

```lua
local v = Vector3.new(1, 2, 3)
print(v.X, v.Y, v.Z, v.Magnitude)
print(v:Lerp(Vector3.new(10, 0, 0), 0.5))
```

## Calling Roblox services

`game.GetService` uses **dot syntax**, not colon:

```lua
local players  = game.GetService("Players")
local lighting = game.GetService("Lighting")
```

Confirmed working services (verified live): `Players`, `Lighting`, `Workspace`, `HttpService`, `RunService`, `TeleportService`, `TextService`, `GamepadService`, `UserInputService`, `ReplicatedStorage`, `StarterGui`, `StarterPack`, `Stats`, `MarketplaceService`. `ServerStorage` returns `nil` (not exposed to client).

> ⚠️ Direct `game.<Service>` is only pre-resolved for `Workspace`, `Players`, `LocalPlayer`. Even `game.Lighting` returns `nil`, you must use `game.GetService("Lighting")`.

## What to read next

1. [Crash triggers](./crash-triggers), what to never touch
2. [`utility`](./libraries/utility), first library reference
3. [For LLMs](./llms), drop-in resources for AI agents

## Documentation status

This site is filled in incrementally. Each library page is published only after every signature on it has been verified in a live sandbox.

| Component | Status |
|---|---|
| `utility` library reference | Published |
| Other 15 libraries | In progress |
| Userdata type docs | Pending |
| Runnable examples | Pending |
| `llms-full.md` consolidated | Pending |


<!-- ===== crash-triggers.md ===== -->

# Crash triggers

These trigger native SEH inside the Serotonin DLL, `pcall` does **not** catch them. Touching them takes down the cheat process. Every entry below is verified by a real crash event.

## Hard crashers (never touch)

| Trigger | Notes |
|---|---|
| `_G` (any access, even `type(_G)` in pcall) | Use `getfenv(1)` instead |
| `game.PlaceID` | |
| `game.DataModel` | |
| `game.LocalPlayer.Backpack` | Most undocumented Player props are crashers |
| `game.LocalPlayer.PlayerGui` / `StarterGear` / `PlayerScripts` / `AccountAge` / `FollowUserId` / `DevEnableMouseLock` / `CameraMode` / `CameraMinZoomDistance` / `AutoJumpEnabled` / etc. | Same pattern, undocumented Player fields |
| Parallel `eval` calls | Sandbox is not thread-safe |
| Reading `Workspace.Destructibles` / `Workspace.Debris` (game-specific) | Dangling pointers in destroyed parts |

## Suspected crashers (avoid blind probing)

| Trigger | Why suspected |
|---|---|
| `string.dump()` with no args | Killed the cheat during signature probing |
| `coroutine.yield()` from main thread | Same probe session crashed |
| `table.move()` with no args | Same probe session crashed |

If you need to call any of these, give them valid arguments. Never call random functions blindly with zero args.

## Patterns that are slow but safe

| Pattern | Mitigation |
|---|---|
| `Workspace:GetDescendants()` on big maps | Limit count; use `entity.GetParts()` instead when available |
| Tight `entity.GetPlayers()` loop with bone reads | Throttle to 30-60 Hz, not 200 Hz |
| `memory.Write` in `onUpdate` (200 Hz) | Throttle to 2 Hz to avoid runtime overload |

## Mythbusters, these are NOT crashers

The following were claimed crashers in older docs / community wisdom but are verified safe in build `version-390ba09e7e944154`:

| Was claimed | Reality |
|---|---|
| `Color3:ToHSV()` | Works, returns `h, s, v` multi-return |
| `game.GetFFlag(name, type)` | Works. Type must be `"int"`, `"bool"`, `"float"`, or `"double"` |
| `game.SetFFlag(name, value, type)` | Works |
| `Vector3.Magnitude` / `.Unit` | Both available |
| All `Vector3` arithmetic operators (`+ - * / -unary`) | Work |

## What to do if you hit a new crasher

1. Note the exact line that triggered it.
2. Don't repeat the call, it will crash again.
3. Open an issue at the [project GitHub](https://github.com/DeftSolutions-dev/serotonin-api-docs/issues) with the eval snippet and a stack trace if available.
4. Wait for a Serotonin restart before continuing.


<!-- ===== methodology.md ===== -->

---
sidebar_position: 100
title: Methodology
---

# How this reference was built

This site is the result of a manual, week-long re-audit of the entire Serotonin Lua API surface for build `version-390ba09e7e944154`. Every page lands only after every signature on it has been roundtripped against the live runtime. Nothing is taken on faith from older docs.

The full process below is what it actually took to get from "the cheat exposes some Lua tables" to "every function has a verified signature with real-life argument errors and return shapes".

## 1. Enumerate everything that exists

The very first step was getting an honest list of what the runtime exposes. The published Serotonin docs have drifted noticeably over the years (functions renamed, removed, or added without being mentioned) so I started from scratch.

I wrote a small Lua script that:

- Walks every binding in `getfenv(0)` and classifies it (table / function / userdata / scalar)
- For each table, enumerates keys via `pairs()` and reads its metatable
- For known userdata samples (Vector3, Color3, a Workspace BasePart, a player from `entity.GetLocalPlayer`, a buffer) brute-force-probes a curated list of candidate field names. Roblox userdata uses an `__index` *function*, not a table, so `pairs(ud)` returns nothing useful and the only way to surface lazy fields is to ask for them by name.

The output is a deterministic JSON snapshot. Re-running it after a Roblox update produces a clean diff against the previous build.

The very first dump revealed, for instance, that `entity` exposes both an old part-method API (`entity.getPartPosition` / `Size` / `Rotation`) and a new one (`entity.GetPartsCount` / `GetPartCubeVertices`), with overlap that the old gitbook does not acknowledge. Knowing both APIs exist mattered for what to test next.

## 2. Probe each function the same way every time

For every canonical function I followed the same six-step protocol. The protocol is mechanical on purpose: I want every page to ask the same questions in the same order so the answers are comparable across libraries.

1. **Existence:** `type(lib.Function) == "function"`. If a name is in the dump but not callable, that goes in the page as a partial.

2. **Argument shape via `pcall(fn)`** with no arguments, then with `nil`, then with progressively larger arg counts. The runtime returns errors of the form `"bad argument #N to '?' (TYPE expected, got no value)"` which give you the exact required type for each argument position. I capture every error verbatim and put it in the page so the reader knows what they will see when they get it wrong.

3. **Valid call** with concrete inputs, capturing the return type, multi-return count via `select("#", ...)`, and the value shape (for tables: keys + value types).

4. **Edge cases**: out-of-range numbers, empty strings, mismatched types, very large arguments, ASLR-shifted addresses. Each surprising behaviour goes into a `:::warning` block on the page.

5. **One runnable example.** Not a contrived snippet, an actual fragment that would appear in real cheat code.

6. **Cross-library example** showing how the function is used together with the rest of the API. This is what makes the difference between a reference page and a tutorial.

A page is not published until at least steps 1-3 are done. Side-effect-heavy functions (`MoveMouse`, `TeleportToPlace`, `audio.PlaySound` with bogus data) are deliberately probed only with argument-shape calls and documented as `partial`, with the real-call section explaining why it was skipped.

## 3. Roundtrip everything that has a side effect

Read-only functions are easy. The hard work was confirming that every side-effecting function actually does what its signature claims. A few examples:

- For `mouse.Click(button)` I had to first map out **two separate button registries** in the cheat: the one `IsClicked` uses (string names like `"left"` / `"right"`) and the one `Click` / `Press` / `Release` use (Windows VK codes 1, 2, 4, 5, 6 plus the strings `"mouse4"` / `"mouse5"`). The cheat error message is different for each registry: `"Unknown key or button name"` for unknown names, `"Invalid mouse button specified for Click"` for valid names that the action does not accept, which is what made the split visible.

- For `keyboard.Press("Shift")` I confirmed the full state cycle with `IsPressed("Shift")` between calls: `false` then `Press` then `true` then `Release` then `false`. The probe script does a 5 ms hold so the IsPressed read inside that window is observable.

- For `audio.PlaySound(wav, false, 1.0, 1.0)` I read a known-good `hit.wav` from disk via `file.read`, then ran every combination of `volume` (0 / 1 / 2) and `pitch` (0.5 / 1 / 2) and `loop` (false / true) to confirm the signature. I also intentionally probed `PlaySound("")`, `PlaySound("not-wav")`, `PlaySound("x")` to confirm what happens on bad input. They all crash the cheat with a native SEH exception that `pcall` cannot catch, that is now in the [crash blacklist](./crash-triggers).

- For `ui.SetValue(tab, container, label, value)` I built a real "Verify" tab in the cheat menu with one of every widget type, then SetValue then GetValue roundtripped each. That probe revealed the surprising things: Dropdown takes a 1-based numeric index, not the option string. Multiselect takes `{[1]=bool, [2]=bool, ...}`. Colorpicker takes `{r,g,b,a}` integer table, not a `Color3`. A `Color3` passed to Colorpicker is silently accepted but does nothing.

- For `websocket.Connect` I registered three callback tables on three separate connections, one PascalCase, one camelCase, one snake_case, and watched which got the `onError` callback when the test endpoint refused. Only camelCase received it. That confirmed the cheat uses camelCase for callbacks and silently drops non-matching keys.

- For `buffer` and `raknet`: re-verified live in the current build, `type(buffer) == "nil"` and `type(raknet) == "nil"`. They are not bound at the global level. Earlier audits documented a vestigial `raknet` that exposed dead hooks; in the current build the table itself is gone. The library doc pages were removed.

Each of these results came from running the probe script in-game, capturing the JSON output, and reconciling it against what the page draft said. Whenever the dump said one thing and live behaviour said another, **live wins**.

## 4. Reconcile against the older gitbook docs

The next step was diffing every page against `serotonin-1.gitbook.io` to find where the old docs are wrong, outdated, or missing. The official docs missed an entire library on more than one occasion, and several signatures were wrong in ways that would crash code copied verbatim.

Concrete corrections that came out of this pass:

- `draw.Image` was documented as `(texId, x, y, w, h, r, g, b, a)` (raw RGBA bytes). The real signature is `(texId, x, y, w, h, color?: Color3, alpha?: number)`. Argument 6 is type-tagged `__color3_meta`; passing an integer raises immediately. I confirmed the correct shape by loading a real PNG with `utility.LoadImage`, then calling `draw.Image` with all 5 / 6 / 7 / 8 argument arities.
- `cheat.LoadString` was documented as a working `(name, code)` form. Every two-argument invocation in this build raises `"C++ exception"`. Standard Lua `loadstring` works fine in the sandbox; I redirect readers to that.
- The `bit`, `websocket`, and `file.append/delete/listdir/mkdir/exists/isdir` surfaces are silently absent from the gitbook. They are now documented end-to-end here. (`buffer` and `raknet` are not bound in the current build - no doc to write.)
- The Roblox Instance method limitations (`Clone`, `WaitForChild`, `ClearAllChildren`, `GetFullName` are all nil) and BasePart property limitations (`Anchored`, `CFrame`, `CanQuery`, `Mass` are nil) are not mentioned in the older docs. These cause silent bugs in user scripts. They are now in the relevant pages.

A list of all gaps in the old docs that this site closes is at the end of this page.

## 5. Audit and translate

Every page was then run through a fixed lint that checks:

- No softening words (`likely`, `probably`, `may`, `appears to`, `seems to`).
- No em-dashes (writing style preference).
- Every claim ties back to a probe script result.
- The function count in the table header matches 1-for-1 against the dump.
- All cross-references resolve to existing anchors.

The same lint runs on both the EN page and the RU mirror so they stay in sync. A change to one always triggers a change to the other.

The translation is intentionally not literal. Function names, error strings, and code stay in English. Prose is translated. Mixed-language reads (e.g. ``"массив of `{[1]=bool, [2]=bool, [3]=bool}` records"``) are preserved when the prose convention is local Russian-language slang for the technical idea, that is how working programmers actually talk.

## 6. Wire up the MCP bridge for live use

The reference is most useful when an LLM agent can read it interactively against a running cheat. The [MCP bridge](./tools/mcp-bridge) project is a separate component that:

- Runs `bridge.lua` inside Serotonin (long-poll Lua client).
- Runs `server.py` outside Serotonin (Python coordinator with stdio MCP).
- Exposes 30 tool wrappers covering exploration (instances, players, parts, bones, screen) plus the full `utility` / `memory` / `file` / `audio` / `ui` API discovered in this audit.
- Pre-flight blacklists every confirmed crasher so an agent driving the cheat from this site cannot accidentally take it down.

Updating the MCP server in lockstep with the audit is what made it possible to use this reference as living documentation rather than a static snapshot.

## Final coverage

| Surface | Functions | Status |
|---|---|---|
| 17 cheat-side libraries | 130 canonical, 282 alias forms | every function probed |
| `Vector3` userdata | 12 static funcs + 5 constants + 5 instance fields + arithmetic operators | full |
| `Color3` userdata | 7 static funcs + 3 instance fields + 3 instance methods | full |
| Page count | 18 content pages × EN + RU = 36 published | |
| Verification artefacts | dump JSON + 30+ probe Lua scripts + per-page error capture | reproducible |

## Gaps in the older Serotonin docs that this site closes

The following items are documented here but were absent or outdated on the older `serotonin-1.gitbook.io`:

- The fact that `buffer` and `raknet` are not bound in the current build (the gitbook still implies they are usable)
- The `bit` library (entirely missing from the gitbook)
- The `websocket` library (entirely missing)
- `file.append` / `delete` / `listdir` / `mkdir` / `exists` / `isdir` (only `read` and `write` were documented)
- `utility.GetSystemTime` / `GetTimestamp` / `TeleportToPlace`
- `mouse.Press` / `Release` (and the two-registry button-name finding)
- `memory.Scan` / `IsValid` (and the `pointer` vs `int64` truthful comparison at the same address)
- `cheat.LoadString` (existence and current broken state)
- `entity.GetPartsCount` / `GetTarget` / `EditModel`
- `draw.GetScreenSize` / `GetMesh` / `GetPartCorners` (and the corrected `Image` signature)
- `ui.NewHotkey` / `GetHotkey` (and the surprising value-format requirements for Multiselect / Colorpicker / Hotkey)
- The fact that `entity.getPartPosition` / `Size` / `Rotation` exist alongside the new `entity.GetPart*` API
- The Roblox Instance method limitations (`Clone` / `WaitForChild` / `ClearAllChildren` / `GetFullName` are nil)
- The BasePart property limitations (`Anchored` / `CFrame` / `CanQuery` / `Mass` are nil)

Anyone who copies a snippet from this site and runs it inside Serotonin should see the same return value the page documents. If they do not, the page is wrong and a re-probe is in order.


<!-- ===== llms.md ===== -->

---
sidebar_position: 99
title: For tools and agents
---

# Pull this reference into your tools

Three different ways to ingest the docs, in order of how much glue code you have to write.

| You want | Use this | Glue you write |
|---|---|---|
| Full doc set as one big markdown blob to paste into a context window | [`llms-full.md`](#single-file-dump-llms-fullmd) | none |
| Index of pages with one-line summaries to point a fetch-only client at | [`llms.txt`](#index-file-llmstxt) | none |
| Live MCP tools so the agent can search and pull pages on demand | [`mcp-serotonin-docs`](#mcp-server-mcp-serotonin-docs) | one config line |

All three are public, free, and require no authentication.

## Single-file dump (`llms-full.md`)

The entire reference (all libraries + all examples + crash triggers + userdata) in one large markdown file, suitable for pasting straight into a model's context window.

```
https://deftsolutions-dev.github.io/serotonin-api-docs/llms-full.md
```

Use it when you want the consumer to know the whole API up-front and never need to re-fetch.

## Index file (`llms.txt`)

Conforms to the [llmstxt.org spec](https://llmstxt.org/). Contains the project description plus a flat list of all documentation pages with links and one-line summaries.

```
https://deftsolutions-dev.github.io/serotonin-api-docs/llms.txt
```

Use it when the consumer should fetch only the pages it actually needs. Pair with a generic fetch-capable MCP server such as [`@modelcontextprotocol/server-fetch`](https://www.npmjs.com/package/@modelcontextprotocol/server-fetch) or any HTTP client.

## MCP server (`mcp-serotonin-docs`)

A stdio MCP server published as an npm package. Wraps the docs as four tools an MCP-capable client can call directly. No remote infrastructure: `npx` pulls the package, the server runs locally on the consumer's machine, every tool call fetches the raw `.md` from this repo's GitHub Pages site.

### Tools the server exposes

| Tool | Inputs | Output |
|---|---|---|
| `list_pages`   | `locale?` (`"en"` / `"ru"`) | Array of `{slug, title, section}` for every doc page |
| `read_page`    | `slug`, `locale?` | Full markdown body of one page |
| `search_pages` | `query`, `locale?` | Pages whose title or body matches, with a snippet |
| `get_function` | `library`, `name`, `locale?` | Just the section for one function (e.g. `memory.Read`, `ui.SetValue`) |

### Install via the navbar

Open any page on this site, click the **Actions** button next to the breadcrumbs, and pick:
- **Install in VSCode**: opens VSCode and pre-fills the MCP install dialog.
- **Command for Codex**: copies `codex mcp add serotonin-docs -- npx -y mcp-serotonin-docs` to your clipboard.

### Install via terminal

VSCode (with the MCP extension):

```bash
code --add-mcp '{"name":"serotonin-docs","command":"npx","args":["-y","mcp-serotonin-docs"]}'
```

Codex:

```bash
codex mcp add serotonin-docs -- npx -y mcp-serotonin-docs
```

Cursor / Cline / generic MCP client (`.mcp.json`, `~/.cursor/mcp.json`, etc.):

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

### Typical agent flow

1. `search_pages({ query: "PlaySound" })` to locate the page.
2. `get_function({ library: "audio", name: "PlaySound" })` to read just that function's section.
3. Or `read_page({ slug: "libraries/audio" })` for the whole page.

Russian locale: pass `{ locale: "ru" }` to any tool.

### Source

The package source lives in the [`mcp-server/`](https://github.com/DeftSolutions-dev/serotonin-api-docs/tree/main/mcp-server) subdirectory of this repo. Tagging `mcp-v*` triggers an auto-publish to npm via GitHub Actions.

## Recommended prompt to attach the docs

```
You are writing scripts for the Serotonin Lua sandbox. The complete and
runtime-verified API reference lives at:

  https://deftsolutions-dev.github.io/serotonin-api-docs/

For full context in a single fetch:
  https://deftsolutions-dev.github.io/serotonin-api-docs/llms-full.md

Conventions you must respect:
  - LuaJIT 2.0.3 sandbox (implements Lua 5.1 - _VERSION reports "Lua 5.1";
    jit, ffi, os, io, debug, buffer, string.buffer, raknet all stripped).
  - Compound function names have PascalCase + camelCase + snake_case
    (e.g. ui.NewCheckbox / ui.newCheckbox / ui.new_checkbox).
    Single-word names also have a lowercase form (memory.Read / memory.read).
    The `file` library is lowercase-canonical (file.read, file.write, ...).
    Multi-letter abbreviations like `fromRGB`, `ToHSV`, `SetFFlag` only have
    PascalCase + camelCase (no working snake_case).
    SCREAMING_SNAKE_CASE is NEVER bound (0 / 177 verified).
    Aliases are distinct Lua callables; never compare via ==.
  - draw.* must be called inside cheat.Register("paint", fn) (alias onPaint).
  - Never pass non-WAV strings to audio.PlaySound, never call
    cheat.LoadString in this build (raises uncatchable C++ exception),
    never read _G or undocumented LocalPlayer fields. They native-crash.
  - mouse.Click / Press / Release accept Windows VK codes (1=L, 2=R,
    4=M, 5=X1, 6=X2) or "mouse4"/"mouse5", NOT "left"/"right".
    mouse.SetPosition / GetPosition do NOT exist in this build -
    use game.SilentAim(x, y) instead.
  - http exposes only Get and Post in this build. Patch/Put/Delete
    are NOT bound.
  - memory.IsValid IS bound and verified. Always gate Read/Write with it.
  - ui.SetValue for Dropdown/Listbox takes a 1-based numeric index, NOT
    the option string. Multiselect takes {[1]=bool, [2]=bool, ...}.
    Colorpicker takes {r,g,b,a} integer table, NOT a Color3 userdata.
  - buffer and raknet tables are NOT bound in current build - both
    return nil at the global. Doc pages for them have been removed.
  - memory.Read accepts 17 type strings: byte, short, ushort, int, uint,
    int64, uint64, float, double, bool, string, ptr, pointer, vector2,
    vector3, color3, cframe. Anything else (dword, qword, long, longlong,
    int8/16/32, uint8/16/32) raises "Invalid memory type for read: '<name>'".
    color3 is multi-return r, g, b (0..255), not a single userdata.
  - Instance:IsA compares ClassName equality, not inheritance -
    ws:IsA("Instance") is FALSE. Check ClassName directly for "is part?"
    style queries (Part, MeshPart, WedgePart, TrussPart, CornerWedgePart).
  - cheat.Register events: paint (alias onPaint, fires per-frame even
    when the menu is closed), onUpdate (~10ms cache thread), onSlowUpdate
    (1 second), shutdown (on unload), newPlace (on teleport).

The official Serotonin docs at serotonin-1.gitbook.io are stale. Prefer
this reference whenever the two conflict.
```


<!-- ===== libraries/utility.md ===== -->

---
sidebar_position: 1
title: utility
---

# `utility`

Time, randomness, mouse, clipboard, screen projection. 15 canonical functions.

| | |
|---|---|
| **Functions** | 15 (45 with aliases) |
| **Verified live** | 13 of 15 (GetFingerprint and TeleportToPlace are partial) |
| **Required event context** | none |
| **Side effects** | `MoveMouse`, `SetClipboard`, `TeleportToPlace` mutate global state. `LoadImage` allocates a texture handle each call. |

> **Aliases.** Every function on this page exists in three forms: `utility.GetTickCount` (canonical), `utility.getTickCount` (camelCase), `utility.get_tick_count` (snake_case). All three call the same C function. See [Overview / Naming convention](../overview#naming-convention).

## Quick reference

| Function | Signature | Notes | Status |
|---|---|---|---|
| [`RandomInt`](#randomint)             | `(a: int, b: int) → int`                          | inclusive `[a, b]`                | <span className="status-badge verified">verified</span> |
| [`RandomFloat`](#randomfloat)         | `(a: number, b: number) → number`                 | inclusive `[a, b]`                | <span className="status-badge verified">verified</span> |
| [`GetTickCount`](#gettickcount)       | `() → int`                                        | milliseconds since cheat startup  | <span className="status-badge verified">verified</span> |
| [`GetDeltaTime`](#getdeltatime)       | `() → number`                                     | seconds since previous frame      | <span className="status-badge verified">verified</span> |
| [`GetSystemTime`](#getsystemtime)     | `() → {year, month, day, hour, minute, second, weekday}` | local time, weekday `0=Sun..6=Sat` | <span className="status-badge verified">verified</span> |
| [`GetTimestamp`](#gettimestamp)       | `() → int`                                        | unix seconds (UTC)                | <span className="status-badge verified">verified</span> |
| [`GetFingerprint`](#getfingerprint)   | `() → string`                                     | empty in this build               | <span className="status-badge partial">partial</span> |
| [`GetMousePos`](#getmousepos)         | `() → {[1] = x, [2] = y}`                         | one array-table, not multi-return | <span className="status-badge verified">verified</span> |
| [`MoveMouse`](#movemouse)             | `(dx: int, dy: int)`                              | relative offset, NOT pixel-perfect (Windows ptr accel applies) | <span className="status-badge verified">verified</span> |
| [`GetMenuState`](#getmenustate)       | `() → bool`                                       | `true` when cheat menu is open    | <span className="status-badge verified">verified</span> |
| [`WorldToScreen`](#worldtoscreen)     | `(v3: Vector3) → screenX: number, screenY: number, onScreen: bool` | `onScreen` = projection valid, not screen-bounds | <span className="status-badge verified">verified</span> |
| [`GetClipboard`](#getclipboard)       | `() → string`                                     | UTF-8, empty for non-text content | <span className="status-badge verified">verified</span> |
| [`SetClipboard`](#setclipboard)       | `(s: string)`                                     | overwrites system clipboard       | <span className="status-badge verified">verified</span> |
| [`LoadImage`](#loadimage)             | `(data: string) → number`                         | PNG/JPG bytes, allocates new texture id every call | <span className="status-badge verified">verified</span> |
| [`TeleportToPlace`](#teleporttoplace) | `(jobId: string)`                                 | join Roblox server by Job ID, can trigger network teleport | <span className="status-badge partial">partial</span> |

---

## `RandomInt`

```lua
utility.RandomInt(a: int, b: int) → int
```

Returns a random integer in the inclusive range `[a, b]`. Pass `a <= b`. Distribution is uniform.

Verified live: `RandomInt(1, 100)` returned `69`, then `38` on consecutive calls.

```lua
local roll = utility.RandomInt(1, 100)
print(roll)
```

---

## `RandomFloat`

```lua
utility.RandomFloat(a: number, b: number) → number
```

Returns a random float in the range `[a, b]`. Pass `a <= b`. Negative ranges are fine: `RandomFloat(-1, 1)` works.

Verified live: `RandomFloat(0, 1)` returned `0.26634337488978`, then `0.48977073860767`.

```lua
local jitter = utility.RandomFloat(-0.5, 0.5)
```

---

## `GetTickCount`

```lua
utility.GetTickCount() → int
```

Returns the cheat-side tick counter in milliseconds. Monotonically increasing.

Verified live value: `99868805` (about 27 hours since cheat startup).

Use it for timing throttles, cooldowns, frame deltas:

```lua
local last = 0
cheat.register("onUpdate", function()
    local now = utility.GetTickCount()
    if now - last < 500 then return end
    last = now
    print("fires every 500 ms")
end)
```

---

## `GetDeltaTime`

```lua
utility.GetDeltaTime() → number
```

Time in **seconds** since the previous frame.

Verified live value: `0.0045325998216867` (about 220 FPS).

```lua
cheat.register("onPaint", function()
    local fps = 1 / math.max(utility.GetDeltaTime(), 0.0001)
    draw.TextOutlined(string.format("FPS: %.0f", fps), 10, 10,
                      Color3.fromRGB(255, 255, 255), "Verdana")
end)
```

---

## `GetSystemTime`

```lua
utility.GetSystemTime() → { year, month, day, hour, minute, second, weekday }
```

Returns local system time as a table. All fields are integers.

`weekday` follows the C `tm_wday` convention: `0 = Sunday`, `1 = Monday`, ... `6 = Saturday`. Verified live: April 25 2026 was a Saturday and the call returned `weekday = 6`.

Verified live output:
```
{ year=2026, month=4, day=25, hour=18, minute=24, second=32, weekday=6 }
```

```lua
local t = utility.GetSystemTime()
local stamp = string.format("%04d-%02d-%02d %02d:%02d:%02d",
    t.year, t.month, t.day, t.hour, t.minute, t.second)
print(stamp)
```

---

## `GetTimestamp`

```lua
utility.GetTimestamp() → int
```

Unix timestamp in seconds since 1970-01-01 UTC.

Verified live value: `1777159472` (April 2026).

```lua
local ts = utility.GetTimestamp()
file.append("events.log", ts .. " script_loaded\n")
```

---

## `GetFingerprint`

```lua
utility.GetFingerprint() → string
```

Hardware fingerprint hash. Intended to be a stable per-machine identifier for licensing or per-machine config files.

:::warning Verified to return empty string in this build
Three consecutive calls all returned `""` (length 0). Treat the return as potentially empty and have a fallback.
:::

```lua
local fp = utility.GetFingerprint()
if fp == nil or fp == "" then
    fp = "unknown-" .. tostring(utility.GetTimestamp())
end
print("HWID:", fp)
```

---

## `GetMousePos`

```lua
utility.GetMousePos() → table { [1] = x, [2] = y }
```

Current mouse position in screen pixels. Origin is top-left, X grows right, Y grows down.

:::warning Returns one array-like table, not multi-return
The function returns a single table whose only keys are integers `1` and `2`. Access via `mp[1]` and `mp[2]`. There is **no** `mp.X` / `mp.Y` shortcut, and the table does **not** spread into `local x, y = ...` (you would get the table in `x` and `nil` in `y`).
:::

Verified live: returned `{[1]=862, [2]=679}` while the cursor was at `(862, 679)`.

```lua
cheat.register("onPaint", function()
    local mp = utility.GetMousePos()
    local x, y = mp[1], mp[2]
    draw.Circle(x, y, 6, Color3.fromRGB(255, 255, 0), 1, 12, 1)
end)
```

---

## `MoveMouse`

```lua
utility.MoveMouse(dx: int, dy: int)
```

Moves the mouse by a **relative** offset (not absolute screen coordinates). Positive `dx` moves right, positive `dy` moves down (same axes as `GetMousePos`). Used internally by silent-aim and triggerbot logic.

```lua
utility.MoveMouse(5, -3)
```

:::warning The argument is NOT in raw screen pixels
Verified live: starting at `(972, 717)`, calling `MoveMouse(30, 0)` moved the cursor to `(1010, 717)`, that is **+38 px**, not +30. Calling `MoveMouse(0, 25)` produced **+47 px** vertical movement. The offset is passed through Windows pointer ballistics (mouse acceleration), which applies a non-linear multiplier based on speed and the current OS sensitivity setting.

Consequences:
- A naive "move +N then move -N" round-trip does **not** return the cursor to the original position. The verify probe ended with a `(-22, 0)` drift after a +30 / -30 pair.
- For aimbot or smooth-aim use cases, you have to either calibrate the multiplier per machine, or call `MoveMouse` repeatedly in tiny steps (1-3 units) where the ballistic curve is closer to linear.
- For unit-tests of cursor movement, prefer comparing the **direction** of the delta, not the magnitude.
:::

:::warning Side effect
Actually moves the system cursor. Never call from `onPaint`. Use `onUpdate` with rate limiting via the `GetTickCount` throttle pattern.
:::

---

## `GetMenuState`

```lua
utility.GetMenuState() → bool
```

Returns `true` if the Serotonin menu is currently open (cursor visible). Use it to suppress aim or movement when the user is interacting with the cheat.

Verified live: returned `true` while menu was open.

```lua
cheat.register("onUpdate", function()
    if utility.GetMenuState() then return end
end)
```

---

## `WorldToScreen`

```lua
utility.WorldToScreen(v3: Vector3) → screenX, screenY, onScreen: bool
```

Projects a world-space `Vector3` to 2D screen coordinates. Returns **three** values: `screenX`, `screenY`, and a `bool`.

Verified live with `Vector3.new(0, 10, 0)`:
```
screenX  = 1201.9686279297
screenY  = 410.52291870117
onScreen = true
select("#", utility.WorldToScreen(v3)) == 3
```

Argument validation (verified):

| Call | Result |
|---|---|
| `WorldToScreen()`              | `"bad argument #1 to '?' (__vector3_meta expected, got no value)"` |
| `WorldToScreen(nil)`           | `"bad argument #1 to '?' (__vector3_meta expected, got nil)"` |
| `WorldToScreen({0,10,0})`      | `"bad argument #1 to '?' (__vector3_meta expected, got table)"` (must be a `Vector3` userdata, not a plain table) |

:::info What `onScreen` actually means
`onScreen` is `true` when the projection is mathematically valid (the point is in front of the camera). It is **not** a screen-rectangle bounds check, a probe with `Vector3.new(-99999, 50, -99999)` still returned `true`. If you need real on-screen check, additionally test `0 <= screenX <= window_w` and `0 <= screenY <= window_h` using `cheat.GetWindowSize()`.
:::

```lua
cheat.register("onPaint", function()
    local lp = entity.GetLocalPlayer()
    if not lp then return end
    local pos = lp:GetBonePosition("HumanoidRootPart")
    if not pos then return end
    local x, y, onScreen = utility.WorldToScreen(pos)
    if onScreen then
        draw.TextOutlined("ME", x, y, Color3.fromRGB(0, 255, 0), "Verdana")
    end
end)
```

---

## `GetClipboard`

```lua
utility.GetClipboard() → string
```

Returns the current system clipboard as a UTF-8 string. Empty string if the clipboard is empty or holds non-text content (image, file, binary). No length cap was observed.

Verified live: returned a 159-character string containing the previously copied Lua snippet.

```lua
local text = utility.GetClipboard()
print("clipboard length:", #text)
```

---

## `SetClipboard`

```lua
utility.SetClipboard(s: string)
```

Replaces the system clipboard with the given string. Returns nothing.

Verified live with a full round-trip: write `"serotonin-test-1777160880"`, immediate `GetClipboard()` returned the exact same string, then restoring the original 232-char value also worked. No latency longer than the next frame was needed.

```lua
local lp = entity.GetLocalPlayer()
if lp then
    utility.SetClipboard("UserId: " .. tostring(lp.UserId))
end
```

:::warning Side effect
Overwrites whatever the user had copied. If you need to be polite, save the previous clipboard with `GetClipboard` and restore it afterwards.
:::

---

## `LoadImage`

```lua
utility.LoadImage(data: string) → number
```

Loads raw image bytes (PNG / JPG) and returns a numeric texture id usable by [`draw.Image`](./draw). Pair with [`file.read`](./file) for an asset pipeline.

Verified live with a 21816-byte PNG: returned id `1` on first call, `2` on second call. **Each call allocates a new texture handle**, the function does not deduplicate. Load once at startup and reuse the id, do not reload every frame or you will leak texture memory.

Bad input is safely rejected through `pcall`:
- garbage string returns error `"Failed to load texture from memory. HRESULT: 0x?"`
- non-string argument returns error `"bad argument #1 to '?' (string expected)"`
- no native crash observed

```lua
local data = file.read("logo.png")
if data then
    local tex = utility.LoadImage(data)
    cheat.register("onPaint", function()
        draw.Image(tex, 20, 20, 64, 64, Color3.new(1, 1, 1), 1)
    end)
end
```

The file goes in `C:\Serotonin\files\` (the script sandbox). Forward slashes in the path.

```lua
local data = file.read("logo.png")
if data then
    local tex = utility.LoadImage(data)
    cheat.register("onPaint", function()
        draw.Image(tex, 20, 20, 64, 64, Color3.new(1, 1, 1), 1)
    end)
end
```

The file goes in `C:\Serotonin\files\` (the script sandbox). Forward slashes in the path.

---

## `TeleportToPlace`

```lua
utility.TeleportToPlace(jobId: string)
```

Joins a specific Roblox server (game instance) by its **Job ID**, the UUID identifier of an active server within the current game. This is **not** a "switch to a different game" call, the place stays the same.

Real signature was recovered from the runtime error message: calling with `nil`, `bool`, or `table` returns:
```
bad argument #1 to '?' (string Job ID expected)
```
Number arguments are accepted too (auto-coerced to string). String arguments do not raise at the call site, but if the Job ID is invalid the cheat can still initiate a teleport attempt that the Roblox client then rejects, which can disconnect you from the current server.

Use it to follow a friend into their private server or rejoin the same instance after a disconnect:

```lua
local job_id = "place-it-here-when-you-have-a-real-job-id"
utility.TeleportToPlace(job_id)
```

A Job ID looks like `df93c2e8-7c18-4f3a-9d1e-9b8a5b2f4e3c` (standard UUID).

:::danger Network side effect
Even with an invalid Job ID, the cheat may initiate a teleport request that the Roblox server rejects mid-flight. This can crash the cheat or kick you from the current server. Never call `TeleportToPlace` with random or guessed strings, only with a real Job ID you obtained from `game.GetService("Players").LocalPlayer` or a friend's profile.
:::

---

## Patterns

### Frame-rate counter
See [`GetDeltaTime`](#getdeltatime).

### Throttled action (every N ms)
See [`GetTickCount`](#gettickcount).

### Save state per machine
```lua
local fp = utility.GetFingerprint()
if fp == nil or fp == "" then fp = "anon" end
local path = "config_" .. string.sub(fp, 1, 8) .. ".json"
file.write(path, '{"theme":"dark"}')
```

### Skip logic when menu open
```lua
cheat.register("onUpdate", function()
    if utility.GetMenuState() then return end
end)
```

### Read mouse position correctly
```lua
local mp = utility.GetMousePos()
local mx, my = mp[1], mp[2]
```


<!-- ===== libraries/memory.md ===== -->

---
sidebar_position: 2
title: memory
---

# `memory`

Direct read / write / pattern scan / address validation on the Roblox process address space. 6 canonical functions.

| | |
|---|---|
| **Functions** | 6 (14 with aliases) |
| **Verified live** | 5 of 6 (Write is partial: documented from dump but not roundtripped for safety) |
| **Required event context** | none |
| **Side effects** | `Write` mutates process memory and can crash the game with a wrong address or type |

> **Aliases.** Two-word names have three forms (`memory.GetBase` / `getBase` / `get_base`). The four single-word verbs (`Read`, `Write`, `Scan`, `Rebase`) have only two: PascalCase + lowercase (`memory.Read` / `memory.read`). See [Overview / Naming convention](../overview#naming-convention).

## Quick reference

| Function | Signature | Notes | Status |
|---|---|---|---|
| [`GetBase`](#getbase)   | `() → number`                                       | base virtual address of the Roblox executable | <span className="status-badge verified">verified</span> |
| [`Rebase`](#rebase)     | `(offset: number) → number`                         | shorthand for `GetBase() + offset`            | <span className="status-badge verified">verified</span> |
| [`IsValid`](#isvalid)   | `(addr: number) → bool`                             | true if `addr` is a readable virtual page     | <span className="status-badge verified">verified</span> |
| [`Read`](#read)         | `(type: string, addr: number) → value`              | typed read, see type table below              | <span className="status-badge verified">verified</span> |
| [`Write`](#write)       | `(type: string, addr: number, value)`               | typed write, same types as Read               | <span className="status-badge partial">partial</span> |
| [`Scan`](#scan)         | `(pattern: string, [module: string]) → number \| table` | first hit when no module, all hits in module otherwise | <span className="status-badge verified">verified</span> |

## Supported types for Read / Write

Re-verified live by reading each type from the start of the Roblox executable (byte at `base = 0x4D = 'M'`). The list below is the **exhaustive** set of accepted type strings - every other variant raises `"Invalid memory type for read: '<name>'"`.

| Type | What it reads | Verified return |
|---|---|---|
| `byte`    | 1 unsigned byte                       | `77` (=`0x4D` = `'M'`) |
| `short`   | 2-byte signed (little-endian)         | `23117` (=`0x5A4D` = `"MZ"`) |
| `ushort`  | 2-byte unsigned                       | `23117` |
| `int`     | 4-byte signed                         | `9460301` (=`0x00905A4D`) |
| `uint`    | 4-byte unsigned                       | `9460301` |
| `int64`   | 8-byte signed                         | `12894362189` |
| `uint64`  | 8-byte unsigned                       | `12894362189` |
| `float`   | 4-byte IEEE 754                       | `1.3256705263351e-38` |
| `double`  | 8-byte IEEE 754                       | `6.3706613826192e-314` |
| `bool`    | 1 byte, non-zero = true               | `true` |
| `string`  | C-string (NUL-terminated)             | `""` at the PE header. `string` reads until a `0x00` byte. Quirky on raw memory, prefer `byte`-loops for known layouts |
| `ptr`     | 8-byte pointer (alias of `pointer`)   | `12894362189` |
| `pointer` | 8-byte pointer                        | `12894362189` |
| `vector2` | Roblox `Vector2` userdata (8 bytes)   | userdata from raw memory |
| `vector3` | Roblox `Vector3` userdata (12 bytes)  | userdata `(0, 0, 0)` from raw memory |
| `color3`  | Color triple (multi-return)           | `r, g, b` as 3 numbers (0..255), e.g. `0, 0, 0` from a zero-filled region |
| `cframe`  | Roblox `CFrame`-shaped Lua table      | table from raw memory |

17 type strings accepted. Verified live in build `version-390ba09e7e944154`.

:::danger These type strings are NOT bound - verified rejected
Direct probe with the API verifier returns `"Invalid memory type for read: '<name>'"` for every name below. Use the canonical entry from the table above instead.

| Rejected | Use instead |
|---|---|
| `dword` | `uint` (32-bit unsigned) |
| `qword` | `uint64` |
| `long`, `longlong` | `int64` |
| `int8`, `int16`, `int32` | `byte`, `short`, `int` |
| `uint8`, `uint16`, `uint32` | `byte`, `ushort`, `uint` |
:::

The Roblox-specific types (`vector2`, `vector3`, `color3`, `cframe`) read raw bytes and reinterpret them as the corresponding Roblox struct. Reading them from random memory (like the PE header above) produces zero-filled values. Use them only on addresses where a real Roblox structure lives.

`color3` is unusual - it is the only Read type that returns **three values** (multi-return `r, g, b`, each `0..255`) rather than a single userdata. Capture it as `local r, g, b = memory.Read("color3", addr)`.

`int` and `int64` are signed and may return **negative** values when the high bit is set; if you need an unsigned interpretation, use `uint` / `uint64`.

---

## `GetBase`

```lua
memory.GetBase() → number
```

Returns the virtual address of the loaded Roblox executable's base.

Verified live: `0x7FF64E430000` (the value will differ each launch due to ASLR). The first two bytes at this address are `0x4D 0x5A` = `MZ`, the standard PE/MS-DOS header signature, confirming this is indeed the executable image base.

```lua
local base = memory.GetBase()
print(string.format("Roblox base: 0x%X", base))
```

---

## `Rebase`

```lua
memory.Rebase(offset: number) → number
```

Shortcut for `GetBase() + offset`. Use it to convert a known module-relative offset (the kind you get from a static IDA / Ghidra analysis) into a runtime virtual address.

Verified:
- `Rebase(0)`     equals `GetBase()`
- `Rebase(0x1000)` equals `GetBase() + 0x1000`

```lua
local addr = memory.Rebase(0x12340)
local value = memory.Read("int", addr)
```

---

## `IsValid`

```lua
memory.IsValid(addr: number) → bool
```

Returns `true` if `addr` falls inside a readable virtual memory page in the Roblox process. Used to gate reads so you do not crash on unmapped memory.

Verified probes:

| Address | Result |
|---|---|
| `0`                  | `false` |
| `base`               | `true`  |
| `base - 1`           | `false` (right at the boundary) |
| `base + 0x100`       | `true`  |
| `0xDEADBEEF`         | `false` |
| `0x7FFFFFFFFFFF`     | `false` (max user-space address) |
| any low-mapped `Scan("4D 5A")` first hit | `true`  (first hit points into a system module that holds another `MZ` header. The exact address is ASLR-shifted per launch) |

```lua
local addr = memory.Rebase(0x12340)
if memory.IsValid(addr) then
    local v = memory.Read("int", addr)
end
```

---

## `Read`

```lua
memory.Read(type: string, addr: number) → value
```

Reads `type` bytes starting at virtual address `addr`. See the [Supported types](#supported-types-for-read--write) table above for accepted type strings and what each returns.

The type list is exact: `int8` / `int16` / `int32` / `uint8` / `uint16` / `uint32` / `dword` / `qword` / `long` / `longlong` and any other variant do **not** work and return error `"Invalid memory type for read: '<name>'"` (re-verified live). Use only the 17 canonical names from the table above.

```lua
local base = memory.GetBase()
local b1 = memory.Read("byte", base)
local b2 = memory.Read("byte", base + 1)
local lfanew = memory.Read("int", base + 0x3C)
print(string.format("MZ: %c%c, PE offset: 0x%X", b1, b2, lfanew))
```

The pointer types (`ptr`, `pointer`) read 8 bytes and return them as a `number`. Validate with `IsValid(...)` before dereferencing.

---

## `Write`

```lua
memory.Write(type: string, addr: number, value)
```

Writes `value` of `type` to `addr`. Accepts the **same 17 type strings** as [`Read`](#read). Verified live: invalid type names raise `"Invalid memory type for write: '<name>'"` (note: `for write`, not `for read` - the error string mirrors the function called).

:::danger Untested with a real address, can crash the process
We did not roundtrip `Write` against a live target in this audit because a wrong address or wrong type can corrupt running Roblox state and crash the game (or worse, send corrupt data to the server). Type-rejection was verified by passing invalid type strings. Actual mutation was not tested.

Use only on addresses whose layout you have already mapped, and gate every call with `IsValid` plus a sanity Read-back check.

Recommended pattern:

```lua
if memory.IsValid(addr) then
    local before = memory.Read("int", addr)
    memory.Write("int", addr, new_value)
    local after = memory.Read("int", addr)
    print(string.format("0x%X: 0x%X -> 0x%X", addr, before, after))
end
```
:::

---

## `Scan`

```lua
memory.Scan(pattern: string,
            returnAll?: bool,
            limit?: number,
            module?: string) → number | table | nil
```

AOB (array-of-bytes) signature scanner. Pattern is a space-separated hex string. `??` is a wildcard byte. Returned values are **absolute virtual addresses**, not module-relative offsets.

| Arg | Type | Default | Meaning |
|---|---|---|---|
| `pattern`   | string  | required          | space-separated hex with `??` wildcards |
| `returnAll` | bool    | `false`           | `false` → return first hit as a number; `true` → return all hits as a table |
| `limit`     | number  | unlimited         | cap how many results to collect when `returnAll=true`. `0`, negative, or very large values are treated as **unlimited** (verified live) |
| `module`    | string  | whole process     | restrict scan to a named module - see exact-match rule below |

Verified return shapes (concrete addresses + counts are session- and ASLR-specific, only the **shape** is stable across runs):

| Call | Return shape | Notes |
|---|---|---|
| `Scan("4D 5A")`                  | `number`              | first absolute address matching MZ in process memory |
| `Scan("4D 5A", false)`           | `number`              | same as above (explicit `returnAll=false`) |
| `Scan("4D 5A", true)`            | `table` of numbers    | all hits, unlimited |
| `Scan("4D 5A", true, 5)`         | `table` of 5 numbers  | first 5 hits |
| `Scan("4D 5A", true, 0)`         | `table` of all hits   | `0` = unlimited (verified live) |
| `Scan("4D 5A", true, -1)`        | `table` of all hits   | negative = unlimited |
| `Scan("4D 5A", false, 1, "ntdll.dll")`   | `number`     | first MZ in `ntdll.dll`'s mapped range |
| `Scan("4D 5A", false, 1, "kernel32.dll")`| `number`     | first MZ in `kernel32.dll` |
| `Scan("4D 5A", false, 1, "user32.dll")`  | `number`     | first MZ in `user32.dll` |
| `Scan("4D 5A", false, 1, "RobloxPlayerBeta.exe")` | nothing | scan completed but returned no hit (the cheat's MZ-match in this module's range did not produce a result in our run; investigate per-build) |
| `Scan("4D 5A", false, 1, "ntdll")` | error | `"Failed to find module for memory scan: ntdll"` - module name must include the file extension |
| `Scan("4D 5A", false, 1, "Roblox")`| error | `"Failed to find module for memory scan: Roblox"` - substring of a real module name is **not** accepted |
| `Scan("4D 5A", false, 1, "")`      | error | `"Failed to find module for memory scan: "` |

:::warning Module name must be exact
Verified live: the `module` string must be the **full** module file name as it appears in the loaded-modules table (`"ntdll.dll"`, `"kernel32.dll"`, `"user32.dll"`, `"RobloxPlayerBeta.exe"`). Substrings (`"ntdll"`, `"Roblox"`) and missing extensions are **rejected** with `"Failed to find module for memory scan: <name>"`. The `.dll` / `.exe` extension is required.
:::

The single-arg / `returnAll=false` form returns the **first** absolute address matching the pattern, or nothing. The `returnAll=true` form returns an **array** of absolute addresses with `#table` count, capped by `limit` if given (or unlimited if `limit` is `0`/negative/missing).

```lua
local addr = memory.Scan("48 8B 05 ?? ?? ?? ?? 48 8B 88")
if addr and memory.IsValid(addr) then
    local disp = memory.Read("int", addr + 3)
    local target = addr + 7 + disp
    print(string.format("resolved RIP-relative target: 0x%X", target))
end
```

```lua
local hits = memory.Scan("E8 ?? ?? ?? ?? 90 90", "RobloxPlayerBeta.exe")
print(string.format("found %d call sites", #hits))
for i, a in ipairs(hits) do
    if i <= 5 then print(string.format("  [%d] = 0x%X", i, a)) end
end
```

:::tip Pattern syntax
- Bytes are uppercase or lowercase hex, two chars each
- Separated by single spaces
- `??` is the wildcard byte (matches anything)
- Invalid hex (anything outside `0-9 A-F`) raises `Invalid byte in pattern: XX`
:::

---

## Patterns

### Read PE header
```lua
local base = memory.GetBase()
local b1 = memory.Read("byte", base)
local b2 = memory.Read("byte", base + 1)
local lfanew = memory.Read("uint", base + 0x3C)
local pe_sig = memory.Read("uint", base + lfanew)
print(string.format("MZ: %c%c, PE offset: 0x%X, PE sig: 0x%X",
    b1, b2, lfanew, pe_sig))
```

### Resolve a static offset to runtime address
```lua
local STATIC_OFFSET = 0x4A12C0
local addr = memory.Rebase(STATIC_OFFSET)
if memory.IsValid(addr) then
    local v = memory.Read("uint64", addr)
    print(string.format("game state: 0x%X", v))
end
```

### Find a function by AOB pattern
```lua
local pat = "48 89 5C 24 08 57 48 83 EC 20 48 8B 05 ?? ?? ?? ??"
local fn_addr = memory.Scan(pat)
if fn_addr then
    print(string.format("function: 0x%X", fn_addr))
end
```

### Walk a pointer chain
```lua
local function follow(addr, offsets)
    for _, off in ipairs(offsets) do
        if not memory.IsValid(addr) then return nil end
        addr = memory.Read("ptr", addr) + off
    end
    return addr
end

local final = follow(memory.Rebase(0x12340), { 0x10, 0x28, 0x0 })
```


<!-- ===== libraries/entity.md ===== -->

---
sidebar_position: 3
title: entity
---

# `entity`

Cached snapshot of all players, plus bone hitbox accessors, custom-model registry, and aim-target query. The single fastest path to per-player data, the cheat keeps this updated for you so you do not pay the cost of walking `game.Players` yourself.

| | |
|---|---|
| **Functions** | 9 (27 with aliases) |
| **Verified live** | 5 of 9 (the 4 model-registry calls are documented from dump and not exercised) |
| **Required event context** | none |
| **Side effects** | `AddModel`, `EditModel`, `RemoveModel`, `ClearModels` mutate the cheat's custom-entity registry |

> **Aliases.** Three forms each: `entity.GetPlayers` / `getPlayers` / `get_players`. See [Overview / Naming convention](../overview#naming-convention).

## Quick reference

| Function | Signature | Notes | Status |
|---|---|---|---|
| [`GetPlayers`](#getplayers)         | `([onlyEnemies: bool]) → table { [1..n] = player }` | array of player userdata, the core query | <span className="status-badge verified">verified</span> |
| [`GetLocalPlayer`](#getlocalplayer) | `() → player`                                       | the local user as a player userdata             | <span className="status-badge verified">verified</span> |
| [`GetTarget`](#gettarget)           | `() → player \| nil`                                | currently aimed-at player or nil                | <span className="status-badge verified">verified</span> |
| [`GetParts`](#getparts)             | `() → table { [1..n] = idx }`                       | cached part indices, often empty                | <span className="status-badge verified">verified</span> |
| [`GetPartsCount`](#getpartscount)   | `() → int`                                          | length of `GetParts()` without allocating a table | <span className="status-badge verified">verified</span> |
| [`AddModel`](#addmodel)             | `(key: string, data: table)`                        | inject a custom entity into the cache           | <span className="status-badge partial">partial</span> |
| [`EditModel`](#editmodel)           | `(key: string, data: table)`                        | mutate fields of a registered custom entity     | <span className="status-badge partial">partial</span> |
| [`RemoveModel`](#removemodel)       | `(key: string)`                                     | drop a registered custom entity                 | <span className="status-badge partial">partial</span> |
| [`ClearModels`](#clearmodels)       | `()`                                                | drop every custom entity at once                | <span className="status-badge partial">partial</span> |

## Player userdata

Every value returned by `GetPlayers`, `GetLocalPlayer`, and `GetTarget` is a **player userdata** with a fixed set of read-only fields and 4 bone-accessor methods. Verified live in The Wild West with 29 active players in the lobby.

### Fields

Access through dot syntax: `p.Name`, `p.Health`, etc.

| Field | Type | Verified example | Notes |
|---|---|---|---|
| `Name`          | `string`           | `"xXSkyXx12345"`               | Roblox username |
| `DisplayName`   | `string`           | `"G59_chris"`                  | display name set by the user |
| `UserId`        | `number`           | `59135288`                     | Roblox UserId, persistent across renames |
| `Team`          | `string`           | `"Cowboys"`, `"Outlaws"`, `"Enemy"` | name of the player's team. NOT an Instance, just the string |
| `TeamColor`     | `userdata`         | `tostring` gives `"49980, 10200, 7140"`, `.R/.G/.B` give `196, 40, 28` | the `.R/.G/.B` accessors return **0..255 byte values** (NOT 0..1 floats like Roblox `Color3`). The `tostring` form is in 16-bit scale (0..65535). See note below. |
| `Weapon`        | `string`           | `"PrimaryDisplay"`             | currently held weapon's identifier, empty when none |
| `Position`      | `Vector3`          | often `(0, 0, 0)`              | **frequently stale**, see warning below |
| `Velocity`      | `Vector3`          | `(0, 0, 0)` when stationary, unit-length direction (e.g. `(-0.76, 0, -0.65)` with `Magnitude == 1`) when moving | normalized walk direction, NOT raw physics velocity. Always `(0,0,0)` for idle players |
| `Health`        | `number`           | `71`                           | current HP |
| `MaxHealth`     | `number`           | `100`                          | max HP |
| `IsAlive`       | `bool`             | `true`                         | live ragdoll / spawned check |
| `IsEnemy`       | `bool`             | `true`                         | true if on opposing team |
| `IsVisible`     | `bool`             | `false`                        | true if not behind a wall (see also `BoundingBox`) |
| `IsWhitelisted` | `bool`             | `false`                        | true if marked friendly via `game.PlayerWhitelist` |
| `BoundingBox`   | `table {x, y, w, h}` | `{x=1277, y=-2917, w=16, h=66}` | screen-space rectangle in pixels, all zeros when off-screen. See note below. |

:::warning `Position` is often stale, use bones instead
In FFA / vehicle / Western style modes, `p.Position` is frequently `(0, 0, 0)` even for living, moving players. The bone accessors below return live world positions every frame:
```lua
local hrp = p:GetBonePosition("HumanoidRootPart")
```
:::

:::info `TeamColor` is a Serotonin custom userdata, NOT a Roblox `Color3`
Verified two-format access on the same value (Outlaws team):
- `tostring(tc)` → `"49980, 10200, 7140"` (16-bit channels, 0..65535)
- `tc.R, tc.G, tc.B` → `196, 40, 28` (byte channels, 0..255)

Use the byte form for everyday work, it matches `Color3.fromRGB(r, g, b)` directly:
```lua
local tc = p.TeamColor
local color = Color3.fromRGB(tc.R, tc.G, tc.B)
```
Note that this differs from Roblox's standard `Color3.R/.G/.B`, which would return 0..1 floats.
:::

:::info `BoundingBox` is a ready-made ESP rectangle
Verified: a visible player gave `{x=1277, y=-2917, w=16, h=66}` (y negative because the player was above the screen this frame). Off-screen players give `{0, 0, 0, 0}`. You can feed it directly into `draw.Rect`:
```lua
local bb = p.BoundingBox
if bb.w > 0 then
    draw.Rect(bb.x, bb.y, bb.w, bb.h, Color3.fromRGB(255, 0, 0), 1, 0, 1)
end
```
:::

### Methods

Player userdata has 4 bone accessors. Bone names are the standard Roblox R15 / R6 part names: `HumanoidRootPart`, `Head`, `UpperTorso`, `LowerTorso`, `LeftUpperArm`, `RightUpperArm`, `LeftUpperLeg`, `RightUpperLeg`, etc.

| Method | Returns | Verified example for `HumanoidRootPart` |
|---|---|---|
| `:GetBonePosition(name)`   | `Vector3`        | `(-1253.6, 170.8, -636.5)` |
| `:GetBoneSize(name)`       | `Vector3`        | `(5.0, 5.0, 5.0)` (the cheat hitbox, not the physical body part size) |
| `:GetBoneRotation(name)`   | `table[1..9]`    | flat 3x3 rotation matrix as 9 numbers |
| `:GetBoneInstance(name)`   | `Instance`       | the underlying Roblox part as a usable Instance handle |

```lua
local p = entity.GetPlayers()[1]
local hrp_pos = p:GetBonePosition("HumanoidRootPart")
local head_pos = p:GetBonePosition("Head")
print(string.format("hrp=(%.1f, %.1f, %.1f)  head=(%.1f, %.1f, %.1f)",
    hrp_pos.X, hrp_pos.Y, hrp_pos.Z,
    head_pos.X, head_pos.Y, head_pos.Z))
```

---

## `GetPlayers`

```lua
entity.GetPlayers([onlyEnemies: bool]) → table { [1..n] = player_userdata }
```

Returns an array of every player the cheat is currently tracking. With `onlyEnemies = true`, the array is pre-filtered to players whose `IsEnemy == true`.

Verified live: full list returned 29 entries, `GetPlayers(true)` returned 8.

```lua
local players = entity.GetPlayers()
print(string.format("tracking %d players", #players))

local enemies = entity.GetPlayers(true)
for _, p in ipairs(enemies) do
    if p.IsAlive then
        local pos = p:GetBonePosition("HumanoidRootPart")
        print(string.format("  enemy %s at (%.1f, %.1f, %.1f) hp=%d",
            p.Name, pos.X, pos.Y, pos.Z, p.Health))
    end
end
```

The returned `userdata` references stay valid as long as you hold them, but their fields update every frame. Re-call `GetPlayers()` every tick if your code can tolerate the iteration cost, or cache the userdata and read fresh fields each frame.

---

## `GetLocalPlayer`

```lua
entity.GetLocalPlayer() → player_userdata
```

Returns the same kind of userdata as `GetPlayers()` but for the local user. Same field set.

Verified live (lobby state, not yet spawned):
```
Name=Hiskhie  UserId=8632930326  Team=Cowboys
Health=0  MaxHealth=0  IsAlive=false  Position=(0,0,0)
```

```lua
local me = entity.GetLocalPlayer()
if me and me.IsAlive then
    print(string.format("HP %d/%d", me.Health, me.MaxHealth))
end
```

---

## `GetTarget`

```lua
entity.GetTarget() → player_userdata | nil
```

Returns the player userdata that the cheat's aim system is currently locked onto, or `nil` if nothing is being targeted right now.

Verified live: returned `nil` when no aimbot target was active.

Use it to drive triggerbot logic without reimplementing target selection:

```lua
cheat.register("onUpdate", function()
    local tgt = entity.GetTarget()
    if tgt and tgt.IsAlive and tgt.IsVisible then
        print("locked on:", tgt.Name)
    end
end)
```

---

## `GetParts`

```lua
entity.GetParts() → table { [1..n] = part_index }
```

Returns the cheat's cached list of part indices for the current map. The cache is populated by games that use the ACS-style entity system, many games leave it empty.

Verified live: returned an empty table (`#parts == 0`) in the Western game probed.

```lua
local parts = entity.GetParts()
for i, idx in ipairs(parts) do
    print(string.format("part %d -> idx %s", i, tostring(idx)))
end
```

The current build does **not** expose per-part read functions (`getPartPosition` / `getPartSize` / `getPartRotation` / `GetPartAddress` / etc are all `nil` in this build's `entity` table). The indices in this list cannot be turned into geometry through the `entity` library alone, you would need to find the underlying Instance and read it directly. Watch the [Methodology](../methodology) page for when the new part API ships.

---

## `GetPartsCount`

```lua
entity.GetPartsCount() → int
```

Length of the `GetParts()` array without allocating a Lua table. Cheap to call every frame.

Verified live: returned `0` in the Western game probed.

```lua
if entity.GetPartsCount() > 0 then
    print("map exposes", entity.GetPartsCount(), "cached parts")
end
```

---

## `AddModel`

```lua
entity.AddModel(key: string, data: table)
```

Registers a Roblox Model into the cheat's cached entity list, so it shows up in subsequent `GetPlayers()` calls and gets the same hitbox / aim treatment as a real player. Useful for adding NPC bots or non-`Player` characters that the cheat does not auto-detect.

`data` table fields, from the dump:

| Field | Required | Type | Notes |
|---|---|---|---|
| `Character`      | yes | `Instance`     | the Model containing the body parts |
| `PrimaryPart`    | yes | `Instance`     | a `BasePart` inside Character used as the position reference |
| `Name`           | yes | `string`       | name shown in `p.Name` |
| `DisplayName`    | no  | `string`       | `p.DisplayName` |
| `Team`           | no  | `string`       | team string |
| `Weapon`         | no  | `string`       | weapon identifier |
| `Humanoid`       | no  | `Instance`     | a `Humanoid` to read MoveDirection from |
| `HealthInstance` | no  | `Instance`     | preferred source of HP, beats raw Health |
| `Health`         | no  | `number`       | current HP if no HealthInstance |
| `MaxHealth`      | no  | `number`       | max HP |

```lua
local char = workspace:FindFirstChild("BotZombie01")
local hrp  = char and char:FindFirstChild("HumanoidRootPart")
local hum  = char and char:FindFirstChildOfClass("Humanoid")
if char and hrp then
    entity.AddModel("bot_zombie_01", {
        Character    = char,
        PrimaryPart  = hrp,
        Name         = "Zombie",
        DisplayName  = "Zombie",
        Team         = "Hostile",
        Humanoid     = hum,
        HealthInstance = hum,
    })
end
```

:::info Schema is permissive at the API boundary
Verified live: `AddModel` does not validate the shape of `data` at the call site. Every table we tried (empty, `{Name=...}`, `{Bones={...}}`, `{Color=Color3...}`, full canonical shape) returned `true`. The cheat's ESP/aim layer is what reads the well-known keys (`Character`, `PrimaryPart`, etc.) - passing extra or missing keys does not raise here, but a registered model with no `Character` / `PrimaryPart` will not produce a usable entity downstream.

| Call | Verified result |
|---|---|
| `AddModel("k", {})`                            | `true` |
| `AddModel("k", { Name = "X" })`                | `true` |
| `AddModel("k", canonical_shape)`               | `true` |
| `AddModel("k", "not-a-table")`                 | error: `"bad argument #2 to '?' (table expected, got string)"` |
| `AddModel("k", 42)`                            | error: `"bad argument #2 to '?' (table expected, got number)"` |
| `RemoveModel("non_existent_key")`              | `false` |

`RemoveModel` returns `true` when an entry was removed, `false` when the key was unknown. `ClearModels()` returns `true`.

Live confirmation that the registered entity appears in `GetPlayers()` is still pending - we did not have a stable bot model in our test scenes. The argument-validation behavior above is verified.
:::

---

## `EditModel`

```lua
entity.EditModel(key: string, data: table)
```

Mutates an already-registered custom entity by `key`. Use the same `data` shape as `AddModel`, only the fields you supply are changed. Useful for updating Health each tick on a custom NPC.

```lua
entity.EditModel("bot_zombie_01", { Health = 42, Weapon = "Axe" })
```

Status: documented from dump, not roundtripped.

---

## `RemoveModel`

```lua
entity.RemoveModel(key: string)
```

Drops one custom entity by its `key`. The Roblox Model itself is untouched, only the cheat's cache entry is removed.

```lua
entity.RemoveModel("bot_zombie_01")
```

Status: documented from dump, not roundtripped.

---

## `ClearModels`

```lua
entity.ClearModels()
```

Drops every custom entity at once. Built-in players (real Roblox `Player` instances) are not affected.

Status: documented from dump, not roundtripped.

---

## Patterns

### Live ESP rectangle straight from `BoundingBox`
```lua
cheat.register("onPaint", function()
    local color = Color3.fromRGB(255, 80, 80)
    for _, p in ipairs(entity.GetPlayers(true)) do
        if p.IsAlive then
            local bb = p.BoundingBox
            if bb.w > 0 then
                draw.Rect(bb.x, bb.y, bb.w, bb.h, color, 1, 0, 1)
            end
        end
    end
end)
```

### Health bar above each enemy head
```lua
cheat.register("onPaint", function()
    for _, p in ipairs(entity.GetPlayers(true)) do
        if p.IsAlive then
            local head = p:GetBonePosition("Head")
            local x, y, on = utility.WorldToScreen(head)
            if on then
                local pct = math.max(0, math.min(1, p.Health / math.max(1, p.MaxHealth)))
                local bar_w = 32
                draw.Rect    (x - bar_w/2 - 1, y - 14 - 1, bar_w + 2, 4,
                              Color3.fromRGB(0, 0, 0), 1, 0, 0.8)
                draw.RectFilled(x - bar_w/2,   y - 14,     bar_w * pct, 2,
                                Color3.fromRGB(0, 255, 0), 0, 1)
            end
        end
    end
end)
```

### Trigger only when an enemy is actually under the crosshair
```lua
cheat.register("onUpdate", function()
    local tgt = entity.GetTarget()
    if not tgt or not tgt.IsAlive or not tgt.IsEnemy then return end
    print("trigger window open on", tgt.Name, "hp=", tgt.Health)
end)
```

### Walk all bones for one player
```lua
local p = entity.GetPlayers()[1]
local bones = {
    "HumanoidRootPart", "Head", "UpperTorso", "LowerTorso",
    "LeftUpperArm", "RightUpperArm", "LeftUpperLeg", "RightUpperLeg",
}
for _, name in ipairs(bones) do
    local pos = p:GetBonePosition(name)
    if pos then
        print(string.format("%-18s = (%.1f, %.1f, %.1f)", name, pos.X, pos.Y, pos.Z))
    end
end
```


<!-- ===== libraries/game.md ===== -->

---
sidebar_position: 4
title: game
---

# `game`

Top-level entry point into the Roblox DataModel and a handful of cheat-side helpers (FFlag access, silent aim, player whitelist). 5 canonical functions plus a small set of pre-resolved fields.

| | |
|---|---|
| **Functions** | 5 (15 with aliases) |
| **Verified live** | 3 of 5 (SetFFlag and SilentAim are partial: documented from dump, not executed for safety) |
| **Required event context** | none |
| **Side effects** | `SetFFlag` mutates a client FFlag, `SilentAim` aims (and may shoot), `PlayerWhitelist` adds a name to the friendly list |

> **Aliases.** Three forms each: `game.GetService` / `getService` / `get_service`. See [Overview / Naming convention](../overview#naming-convention).

> **Dot syntax, not colon.** `game.GetService("Players")` works, `game:GetService("Players")` fails because the `game` table is a Lua table proxy, not a Roblox Instance userdata.

## Quick reference

| Function | Signature | Notes | Status |
|---|---|---|---|
| [`GetService`](#getservice)         | `(name: string) → userdata \| nil` | get a Roblox service by ClassName, returns nil for unknown / non-string args (except nil which raises) | <span className="status-badge verified">verified</span> |
| [`GetFFlag`](#getfflag)             | `(name: string, type: string) → value \| nil` | read a Roblox FFlag, type must be `'int'`, `'bool'`, `'float'`, or `'double'`     | <span className="status-badge verified">verified</span> |
| [`SetFFlag`](#setfflag)             | `(name: string, value, type: string)` | write a Roblox FFlag, same type list as `GetFFlag` | <span className="status-badge partial">partial</span> |
| [`SilentAim`](#silentaim)           | `(x: number, y: number)` | aim at a screen position, can trigger a shot | <span className="status-badge partial">partial</span> |
| [`PlayerWhitelist`](#playerwhitelist) | `(name: string)` | add a player name to the cheat's friendly list | <span className="status-badge verified">verified</span> |

## `game.*` fields

Verified live:

| Field | Type | Notes |
|---|---|---|
| `game.Workspace`        | `userdata` (Roblox `Workspace`)        | always available, ClassName=`Workspace` |
| `game.Players`          | `userdata` (Roblox `Players`)          | always available, ClassName=`Players` |
| `game.LocalPlayer`      | `userdata` (Roblox `Player`)           | always available, ClassName=`Player` |
| `game.CameraPosition`   | `Vector3`                              | live camera position, e.g. `(1884.64, 211.28, 3625.01)` |
| `game.Lighting`         | `nil`                                  | **the direct `game.Lighting` is `nil` in this build, use `game.GetService("Lighting")` instead** |

> ⚠️ Other Roblox services like `Stats`, `MarketplaceService`, `RunService`, etc. are **not** pre-resolved as `game.<Name>`. Always use `game.GetService(name)` to fetch them.

---

## `GetService`

```lua
game.GetService(name: string) → userdata | nil
```

Returns the Roblox service Instance whose ClassName is `name`. Returns `nil` for unknown service names, empty string, or non-string arguments. Passing `nil` raises an error.

Verified live, services that returned a userdata:

`Players`, `Lighting`, `Workspace`, `HttpService`, `RunService`, `TeleportService`, `TextService`, `GamepadService`, `UserInputService`, `ReplicatedStorage`, `StarterGui`, `StarterPack`, `Stats`, `MarketplaceService`.

Verified live, returned `nil`:

`ServerStorage` (server-side only, not exposed to the client).

Error cases:
- `GetService('NotARealService123')` → `nil`
- `GetService('')` → `nil`
- `GetService(123)` → `nil`
- `GetService(nil)` raises `"bad argument #1 to '?' (string expected, got no value)"`

```lua
local players = game.GetService("Players")
local lighting = game.GetService("Lighting")
local http = game.GetService("HttpService")
```

---

## `GetFFlag`

```lua
game.GetFFlag(name: string, type: string) → value | nil
```

Reads a Roblox `FFlag` (FastFlag) by name. The `type` argument tells the function how to decode the underlying value.

Verified valid type strings: `'int'`, `'bool'`, `'float'`, `'double'`.

Any other type raises `"Invalid FFlag type specified: '<type>'. Use 'int', 'bool', 'float', or 'double'."`. Missing `name` or `type` raise the standard `"bad argument #N (string expected, got no value)"`.

If the FFlag with the given name is not present in this Roblox client, the call returns `nil` (no error). In our verify run, common names like `DebugDisplayFPS`, `TaskSchedulerTargetFps`, `EnableQuickGameLaunch` all returned `nil`. Roblox keeps an internal flag table and only exposes a subset of names to the cheat sandbox.

```lua
local fps_cap = game.GetFFlag("TaskSchedulerTargetFps", "int")
if fps_cap then
    print(string.format("Roblox FPS cap = %d", fps_cap))
else
    print("flag not exposed in this build")
end
```

:::warning This is **not** a crasher despite older docs
The `game.GetFFlag/SetFFlag` pair was claimed to be a native crasher in older community memory, but is verified safe in build `version-390ba09e7e944154`. See [Crash triggers / Mythbusters](../crash-triggers#mythbusters-these-are-not-crashers).
:::

---

## `SetFFlag`

```lua
game.SetFFlag(name: string, value, type: string)
```

Writes a value into a Roblox FFlag. The `type` argument uses the same string set as `GetFFlag` (`'int'`, `'bool'`, `'float'`, `'double'`). The value is interpreted in that type.

Status: **partial**. Signature is documented from the dump and the `GetFFlag` counterpart is fully verified. We did not call `SetFFlag` in the verify run because mutating a client FFlag changes Roblox runtime behavior in ways that are hard to roll back without restarting Roblox.

```lua
game.SetFFlag("DebugDisplayFPS", true, "bool")
```

:::danger Side effect
A bad FFlag write can change Roblox internal behavior (rendering, networking, animation). Restore the previous value or restart Roblox if you experiment with this.
:::

---

## `SilentAim`

```lua
game.SilentAim(x: number, y: number)
```

Tells the cheat aim system to point at the given screen-space `(x, y)`. Used by triggerbot / silent-aim implementations.

Status: **partial**. Signature is documented from the dump. Not called in the verify run because depending on game mode and aim configuration this can fire a shot from the player's current weapon.

```lua
local mp = utility.GetMousePos()
game.SilentAim(mp[1], mp[2])
```

:::danger Side effect
May trigger a shot. Combine with throttling and a friend / enemy check (for example via [`entity.GetTarget`](./entity#gettarget)) before invoking.
:::

---

## `PlayerWhitelist`

```lua
game.PlayerWhitelist(name: string)
```

Adds a player username to the cheat's friendly list. After this call, the matching player's `IsWhitelisted` field becomes `true` and aim systems should skip them.

Returns `nil`. Same arg-handling pattern as `GetService`:
- `PlayerWhitelist('verify_probe_xyz_999')` → `nil` (silent success)
- `PlayerWhitelist('')` → `nil`
- `PlayerWhitelist(123)` → `nil` (silent, number not coerced into a real entry)
- `PlayerWhitelist(nil)` raises `"bad argument #1 to '?' (string expected)"`

```lua
game.PlayerWhitelist("MyFriendUserName")
```

There is no documented `RemovePlayerWhitelist` companion. Once added, the entry persists for the script lifetime.

---

## Patterns

### Save-and-restore the system clipboard while reading services
```lua
local players = game.GetService("Players")
print(string.format("server has %d players", #players:GetChildren()))
```

### Use a service that is NOT pre-resolved on `game`
```lua
local market = game.GetService("MarketplaceService")
```

### Check an FFlag and fall back if it is not exposed
```lua
local cap = game.GetFFlag("TaskSchedulerTargetFps", "int")
if not cap or cap == 0 then cap = 60 end
print("frame budget:", cap)
```

### Whitelist a friend at script load
```lua
for _, friend in ipairs({"FriendOne", "FriendTwo"}) do
    game.PlayerWhitelist(friend)
end
```

### Read live camera position
```lua
cheat.register("onUpdate", function()
    local cam = game.CameraPosition
    if cam then
        print(string.format("cam=(%.0f, %.0f, %.0f)", cam.X, cam.Y, cam.Z))
    end
end)
```


<!-- ===== libraries/cheat.md ===== -->

---
sidebar_position: 5
title: cheat
---

# `cheat`

Three core helpers exposed by the Serotonin runtime: event registration (`Register`), window-size query (`GetWindowSize`), and runtime code execution (`LoadString`). 3 canonical functions.

| | |
|---|---|
| **Functions** | 3 (8 with aliases) |
| **Verified live** | 2 of 3 (`Register` and `GetWindowSize`) |
| **Required event context** | none |
| **Side effects** | `Register` adds a persistent per-event callback that cannot be unregistered for the script lifetime. `LoadString` would execute its code if it worked. |

> **Aliases.** `Register` has **two** forms (`cheat.Register` / `cheat.register`). `GetWindowSize` and `LoadString` each have **three** forms (PascalCase / camelCase / snake_case). See [Overview / Naming convention](../overview#naming-convention).

> **Aliases are distinct function objects.** Verified: `cheat.Register == cheat.register` returns `false`, even though they call the same underlying C function and behave identically. Do not rely on `==` to identify a specific API function, compare names instead.

## Quick reference

| Function | Signature | Notes | Status |
|---|---|---|---|
| [`Register`](#register)         | `(event: string, callback: function)` | register a callback for a named event. **No event-name validation**, see notes | <span className="status-badge verified">verified</span> |
| [`GetWindowSize`](#getwindowsize) | `() → width, height` (multi-return) | Roblox window size in pixels | <span className="status-badge verified">verified</span> |
| [`LoadString`](#loadstring)     | `(name: string, code: string)` | runtime code execution. **Broken in build `version-390ba09e7e944154`** | <span className="status-badge partial">partial</span> |

---

## `Register`

```lua
cheat.Register(event: string, callback: function)
```

Registers a callback for a named event. The callback fires whenever the cheat dispatches that event.

### Known dispatched events

| Event name | Fires |
|---|---|
| `onUpdate`     | logic tick (~5 ms) |
| `onSlowUpdate` | background tick (~1 s) |
| `onPaint`      | per-frame, **required context for every `draw.*` call** |
| `shutdown`     | when the script unloads |
| `newPlace`     | when the player teleports to a new place |

### Important: no event-name validation

Verified: `cheat.Register` silently accepts **any** string (or number) as the first argument, including:

- Garbage names like `"totally_invalid_event_xyz_999"` → `ok = true`, no error
- Empty string `""` → `ok = true`
- Wrong-case versions of known events: `"OnUpdate"`, `"ONUPDATE"`, `"on_update"` → all `ok = true`
- A number: `Register(123, function() end)` → `ok = true`

These calls register the callback into an internal table, but the callback **never fires** because nothing dispatches that event name. The 5 names in the table above are case-sensitive and the only ones the cheat actually dispatches.

### Argument validation

| Call | Result |
|---|---|
| `Register()`              | `"bad argument #1 to '?' (string expected, got no value)"` |
| `Register("onUpdate")`    | `"bad argument #2 to '?' (function expected, got no value)"` |
| `Register("onUpdate", nil)`     | `"bad argument #2 to '?' (function expected, got nil)"` |
| `Register("onUpdate", "str")`   | `"bad argument #2 to '?' (function expected, got string)"` |
| `Register(nil, fn)`             | `"bad argument #1 to '?' (string expected, got nil)"` |
| `Register(123, fn)`             | accepted silently (numeric event names allowed but never dispatched) |

### Cannot be unregistered

There is no `Unregister` API. Once you call `cheat.Register`, the callback persists for the entire script lifetime. Re-running a script (without restarting Roblox) **stacks** new callbacks onto the old ones. Guard against double-registration in development:

```lua
if not _ALREADY_LOADED then
    _ALREADY_LOADED = true
    cheat.Register("onPaint", function()

    end)
end
```

### Examples

```lua
cheat.Register("onUpdate", function()
    local lp = entity.GetLocalPlayer()
    if not lp then return end

end)

cheat.Register("onPaint", function()
    draw.Text("hello", 10, 10, Color3.fromRGB(255, 255, 255), 14, 1)
end)

cheat.Register("shutdown", function()
    print("script unloading, cleaning up...")
end)
```

---

## `GetWindowSize`

```lua
cheat.GetWindowSize() → width: number, height: number
```

Returns the Roblox window's pixel dimensions as **two return values** (multi-return), not a packed table.

Verified live: `cheat.GetWindowSize()` returned `(2048, 1208)` on a 2K display in windowed mode. `select("#", cheat.GetWindowSize())` returned `2`.

```lua
local w, h = cheat.GetWindowSize()
draw.Text(string.format("%dx%d", w, h), w - 80, 4, Color3.fromRGB(200, 200, 200), 12, 1)
```

You can also pack into a table if you prefer:

```lua
local size = { cheat.GetWindowSize() }
```

Compare with [`draw.GetScreenSize`](../libraries/utility#worldtoscreen) (when documented), which is the same value but callable inside drawing context.

---

## `LoadString`

```lua
cheat.LoadString(scriptContent: string, scriptName: string)
```

:::danger Still broken in build `version-390ba09e7e944154`
Re-verified live with the API verifier: `cheat.LoadString("return 1+2", "verify_chunk")` raises `"C++ exception"` - the same uncatchable native error reported in earlier audits. The patch note *"Improved exception safety in decompiler"* in this build did **not** make `LoadString` usable; every two-argument invocation we have tried (valid Lua source, syntax errors, runtime errors, raw bytecode, empty strings) raises `"C++ exception"` and `pcall` does **not** catch it (it is reflected to Lua only when the cheat survives, which it does in the current build, but the function never executes the chunk).

Treat `cheat.LoadString` as **non-functional** in the current build. Use the standard Lua `loadstring` / `load` instead.
:::

Signature (from IntelliSense and confirmed via `pcall`):

- Argument 1: `scriptContent` - Lua source string or LuaJIT bytecode (required)
- Argument 2: `scriptName` - chunk name shown in error messages (required)
- Return: would be the loaded chunk; in the current build the call raises `"C++ exception"` before returning

:::tip Use standard Lua `loadstring` for typical remote-script execution
For the common pattern of fetching a script over HTTP and running it, the standard Lua-5.1 `loadstring` (exposed by Serotonin's sandboxed LuaJIT) is the right tool - it compiles source into a callable chunk that you invoke yourself:

```lua
http.Get(
    "https://example.com/payload.lua",
    {},
    function(response)
        local chunk, err = loadstring(response)
        if chunk then chunk() end
    end
)
```

`loadstring` returns `function | nil, errorMessage`, lets you inspect the chunk before running, and supports compile-time syntax errors. `cheat.LoadString` is a separate Serotonin-specific helper whose side effects in the current build are not load-and-return; reach for `loadstring` first.
:::

### Verified argument validation (these errors fire BEFORE the C++ exception)

| Call | Result |
|---|---|
| `LoadString()`                | `"bad argument #1 to '?' (string expected, got no value)"` |
| `LoadString("x = 1")`         | `"bad argument #2 to '?' (string expected, got no value)"` |
| `LoadString(nil, "x = 1")`    | `"bad argument #1 to '?' (string expected, got nil)"` |
| `LoadString("n", nil)`        | `"bad argument #2 to '?' (string expected, got nil)"` |
| `LoadString("n", 123)`        | `"C++ exception"` (numeric code reaches the loader) |

### Verified failure modes (all 2-arg, any code we tried)

| Call | Result |
|---|---|
| `LoadString("a", "x = 1")`               | `"C++ exception"` |
| `LoadString("a", "return 42")`           | `"C++ exception"` (lone `return` claim from earlier docs) |
| `LoadString("a", "this is = not.lua")`   | `"C++ exception"` (syntax error) |
| `LoadString("a", "error('boom')")`       | `"C++ exception"` (runtime error) |
| `LoadString("a", "file.write('m','EXEC')")` | `"C++ exception"`, file unchanged |

If you need to evaluate dynamic code, prefer Lua's standard `loadstring`/`load` (still present in the sandbox) and call it explicitly:

```lua
local fn, err = loadstring("return 1 + 2")
if fn then print(fn()) else print("compile failed:", err) end
```

This pattern works reliably in the sandbox while `cheat.LoadString` does not.

---

## Patterns

### Idempotent script load
```lua
if not _MTC_BOOTED then
    _MTC_BOOTED = true
    cheat.Register("onUpdate", function() ... end)
    cheat.Register("onPaint",  function() ... end)
end
```

### Window-aware HUD anchoring
```lua
cheat.Register("onPaint", function()
    local w, h = cheat.GetWindowSize()

    local bx, by = w - 240, h - 80
    draw.RectFilled(bx, by, 230, 70, Color3.new(0.1, 0.1, 0.12), 4, 0.85)
    draw.Text("MTC v0.1", bx + 8, by + 8, Color3.new(1, 1, 1), 14, 1)
end)
```

### Cleanup on unload
```lua
cheat.Register("shutdown", function()

    file.write("session.log", string.format("ended at %d\n", utility.GetTickCount()))
end)
```

### Event timing comparison
```lua
local update_count, paint_count = 0, 0
cheat.Register("onUpdate", function() update_count = update_count + 1 end)
cheat.Register("onPaint",  function() paint_count  = paint_count  + 1 end)
cheat.Register("onSlowUpdate", function()
    print(string.format("update=%d/s  paint=%d/s", update_count, paint_count))
    update_count, paint_count = 0, 0
end)
```


<!-- ===== libraries/bit.md ===== -->

---
sidebar_position: 6
title: bit
---

# `bit`

LuaJIT-style bitwise operations on 32-bit integers. 12 canonical functions, all single lowercase form (no aliases).

| | |
|---|---|
| **Functions** | 12 |
| **Verified live** | 12 of 12 |
| **Required event context** | none |
| **Side effects** | none, pure functions |
| **Integer width** | 32 bits, results are signed `int32` (range `-2147483648..2147483647`) |

> **Single form only.** Lua-standard library convention: `bit.band`, `bit.bor`, etc. No PascalCase or camelCase aliases. See [Overview / Naming convention](../overview#naming-convention).

> **Shift counts are masked to 5 bits.** `lshift(1, 32)` returns `1` (not `0`), because `32 & 31 = 0`. Same for `rshift`, `arshift`, `rol`, `ror`. Negative counts also wrap: `lshift(1, -1)` is `lshift(1, 31)`.

## Quick reference

| Function | Signature | Notes | Status |
|---|---|---|---|
| [`band`](#band-bor-bxor)   | `(a, b, ...) → int32` | bitwise AND, variadic in 3+ args                         | <span className="status-badge verified">verified</span> |
| [`bor`](#band-bor-bxor)    | `(a, b, ...) → int32` | bitwise OR, variadic                                     | <span className="status-badge verified">verified</span> |
| [`bxor`](#band-bor-bxor)   | `(a, b, ...) → int32` | bitwise XOR, variadic                                    | <span className="status-badge verified">verified</span> |
| [`bnot`](#bnot)            | `(a) → int32`         | bitwise NOT                                              | <span className="status-badge verified">verified</span> |
| [`lshift`](#lshift-rshift-arshift) | `(a, n) → int32` | logical left shift, count masked to `n & 31`         | <span className="status-badge verified">verified</span> |
| [`rshift`](#lshift-rshift-arshift) | `(a, n) → int32` | logical right shift (zero-fill)                      | <span className="status-badge verified">verified</span> |
| [`arshift`](#lshift-rshift-arshift) | `(a, n) → int32` | arithmetic right shift (sign-extending)             | <span className="status-badge verified">verified</span> |
| [`rol`](#rol-ror)          | `(a, n) → int32`      | rotate left                                              | <span className="status-badge verified">verified</span> |
| [`ror`](#rol-ror)          | `(a, n) → int32`      | rotate right                                             | <span className="status-badge verified">verified</span> |
| [`bswap`](#bswap)          | `(a) → int32`         | swap byte order (4-byte endian flip)                     | <span className="status-badge verified">verified</span> |
| [`tobit`](#tobit)          | `(a) → int32`         | normalize Lua number to 32-bit signed, **rounds** to nearest | <span className="status-badge verified">verified</span> |
| [`tohex`](#tohex)          | `(a, n?) → string`    | hex-string, `n` controls width and case sign             | <span className="status-badge verified">verified</span> |

---

## `band` / `bor` / `bxor`

```lua
bit.band(a, b, ...) → int32
bit.bor (a, b, ...) → int32
bit.bxor(a, b, ...) → int32
```

Bitwise AND, OR, XOR. **Variadic** in 3+ arguments, the operation is folded left-to-right. Single-argument form returns the input unchanged.

Verified:

| Call | Result |
|---|---|
| `bit.band(0xFF, 0x0F)`         | `15` (`0x0F`) |
| `bit.band(0xFF, 0x0F, 0x03)`   | `3` (variadic) |
| `bit.band(1)`                  | `1` (single-arg = identity) |
| `bit.bor (0x0F, 0xF0)`         | `255` (`0xFF`) |
| `bit.bor (0x01, 0x02, 0x04, 0x08)` | `15` (variadic, 4 args) |
| `bit.bxor(0xFF, 0x0F)`         | `240` (`0xF0`) |
| `bit.bxor(1, 2, 3)`            | `0` (`1 ^ 2 ^ 3`) |

```lua
local flags = bit.bor(FLAG_A, FLAG_B, FLAG_C)
local masked = bit.band(value, 0xFF)
```

---

## `bnot`

```lua
bit.bnot(a) → int32
```

Bitwise NOT. Result is 32-bit signed.

| Call | Result |
|---|---|
| `bit.bnot(0)`           | `-1` (`0xFFFFFFFF` as signed) |
| `bit.bnot(0xFFFFFFFF)`  | `0` |
| `bit.bnot(0xFF)`        | `-256` (`0xFFFFFF00`) |

```lua

local cleared = bit.band(value, bit.bnot(MASK))
```

---

## `lshift` / `rshift` / `arshift`

```lua
bit.lshift (a, n) → int32
bit.rshift (a, n) → int32
bit.arshift(a, n) → int32
```

The shift count is masked to its low 5 bits (`n & 31`), matching x86 `SHL/SHR/SAR` instructions and LuaJIT semantics.

| Call | Result |
|---|---|
| `lshift(1, 0)`            | `1` |
| `lshift(1, 4)`            | `16` |
| `lshift(1, 31)`           | `-2147483648` (sign bit) |
| `lshift(1, 32)`           | `1` (count `& 31 = 0`, no shift) |
| `lshift(1, 33)`           | `2` (count `& 31 = 1`) |
| `lshift(1, -1)`           | `-2147483648` (count `& 31 = 31`) |
| `rshift(0xFFFFFFFF, 4)`   | `268435455` (`0x0FFFFFFF`) |
| `rshift(-1, 1)`           | `2147483647` (`0x7FFFFFFF`, zero-fill) |
| `arshift(-1, 1)`          | `-1` (sign-extending) |
| `arshift(0x80000000, 4)`  | `-134217728` (`0xF8000000`) |

```lua
local hi_byte = bit.band(bit.rshift(packed, 24), 0xFF)
local signed  = bit.arshift(bit.lshift(byte_value, 24), 24)
```

---

## `rol` / `ror`

```lua
bit.rol(a, n) → int32
bit.ror(a, n) → int32
```

Bits shifted out one end re-enter the other. Rotation count is masked to `n & 31`.

| Call | Result |
|---|---|
| `rol(0x12345678, 8)` | `0x34567812` (= `878082066`) |
| `ror(0x12345678, 8)` | `0x78123456` (= `2014458966`) |

---

## `bswap`

```lua
bit.bswap(a) → int32
```

Reverses the byte order of the 4-byte value. Useful for swapping between big-endian and little-endian representations.

Verified: `bit.bswap(0x12345678)` returns `0x78563412` (= `2018915346`).

```lua
local le_value = 0x12345678
local be_value = bit.bswap(le_value)
```

---

## `tobit`

```lua
bit.tobit(a) → int32
```

Normalizes a Lua number to a 32-bit signed integer.

| Call | Result | Notes |
|---|---|---|
| `tobit(0)`            | `0` | |
| `tobit(2147483647)`   | `2147483647` | exact `INT32_MAX` |
| `tobit(2147483648)`   | `-2147483648` | wraps via 32-bit truncation |
| `tobit(-1)`           | `-1` | |
| `tobit(0xFFFFFFFF)`   | `-1` | same bit pattern as `-1` in `int32` |
| `tobit(1.7)`          | `2` | **rounds to nearest**, NOT truncates |

:::warning `tobit` rounds, it does not truncate
`bit.tobit(1.7)` returns `2`, not `1`. If you need truncation use `math.floor(x)` before passing the value in. Other `bit.*` functions accept floats and apply the same rounding internally.
:::

---

## `tohex`

```lua
bit.tohex(a)            → string
bit.tohex(a, n)         → string
```

Returns a hexadecimal string. The length argument controls both the field width and the letter case sign:

| Call | Result |
|---|---|
| `tohex(0xABCD)`     | `"0000abcd"` (default 8 chars, lowercase) |
| `tohex(0xABCD, 4)`  | `"abcd"` |
| `tohex(0xABCD, 8)`  | `"0000abcd"` |
| `tohex(0xABCD, -4)` | `"ABCD"` (**negative width = uppercase**) |
| `tohex(0)`          | `"00000000"` |
| `tohex(-1)`         | `"ffffffff"` (signed -1 = `0xFFFFFFFF`) |

```lua
print(bit.tohex(addr, 16))
print(bit.tohex(value, -8))
```

---

## Error / edge cases

| Call | Result |
|---|---|
| `band()`           | `"bad argument #1 to '?' (number expected, got no value)"` |
| `band(nil)`        | same |
| `band("s")`        | `"bad argument #1 to '?' (number expected, got string)"` |
| `band(1)`          | `1` (single-arg returns input unchanged) |
| `bnot()`           | `"bad argument #1 to '?' (number expected, got no value)"` |
| `lshift(1)`        | `"bad argument #2 to '?' (number expected, got no value)"` |

`bit.*` functions never crash on out-of-range inputs, all coercions go through `tobit` semantics.

---

## Patterns

### Pack four bytes into a u32
```lua
local function pack_be(b3, b2, b1, b0)
    return bit.bor(
        bit.lshift(b3, 24),
        bit.lshift(b2, 16),
        bit.lshift(b1,  8),
        b0)
end
local rgba = pack_be(255, 128, 0, 255)
```

### Unpack a packed RGBA color
```lua
local function unpack_rgba(packed)
    return bit.band(bit.rshift(packed, 24), 0xFF),
           bit.band(bit.rshift(packed, 16), 0xFF),
           bit.band(bit.rshift(packed,  8), 0xFF),
           bit.band(packed,                 0xFF)
end
```

### Test, set, clear, toggle a bit
```lua
local function bit_test(v, n)   return bit.band(v, bit.lshift(1, n)) ~= 0 end
local function bit_set(v, n)    return bit.bor(v, bit.lshift(1, n)) end
local function bit_clear(v, n)  return bit.band(v, bit.bnot(bit.lshift(1, n))) end
local function bit_toggle(v, n) return bit.bxor(v, bit.lshift(1, n)) end
```

### Sign-extend a smaller-width value to int32
```lua
local function sign_extend(value, src_bits)
    local shift = 32 - src_bits
    return bit.arshift(bit.lshift(value, shift), shift)
end

print(sign_extend(0xFF, 8))
print(sign_extend(0x7F, 8))
```

### Hex-dump a value
```lua
print(string.format("addr = 0x%s", bit.tohex(addr, -8)))
```


<!-- ===== libraries/file.md ===== -->

---
sidebar_position: 8
title: file
---

# `file`

Sandboxed filesystem access. 8 canonical functions, all single lowercase form (no aliases).

| | |
|---|---|
| **Functions** | 8 |
| **Verified live** | 8 of 8 |
| **Required event context** | none |
| **Side effects** | reads, writes, deletes, creates files and directories on disk |
| **Sandbox root** | the cheat's `files/` directory (relative paths resolve here) |

> **Single form only.** `file.read`, `file.write`, etc. No PascalCase aliases. See [Overview / Naming convention](../overview#naming-convention).

> **Binary-safe.** `file.write`/`file.read` preserve every byte including `\0`. Verified with a 7-byte payload containing nulls and high-bit bytes.

## Sandbox

Path semantics, verified live:

- **Relative paths** resolve under the cheat's `files/` directory. `file.write("data.json", json)` lands at `<cheat>/files/data.json`.
- **`..` is blocked** with a hard error: `read("../foo")` raises `"File path cannot contain '..'"`.
- **Absolute Windows paths bypass the sandbox.** `file.read("C:/Windows/win.ini")` returned the actual file contents in our verify run. Treat the sandbox as advisory, not a security boundary.
- **`write` does not create parent directories.** `file.write("subdir/inner.txt", "x")` silently returns `false` if `subdir/` does not exist. Use [`mkdir`](#mkdir) first (it is recursive).
- **Empty string `""` and no-arg both refer to the root** for `exists`, `listdir`. For `read`/`write` they error.

## Quick reference

| Function | Signature | Notes | Status |
|---|---|---|---|
| [`read`](#read)       | `(path: string) → string \| nil` | full file content as string                              | <span className="status-badge verified">verified</span> |
| [`write`](#write)     | `(path: string, content: string) → bool` | overwrites, **does NOT create parent dirs**     | <span className="status-badge verified">verified</span> |
| [`append`](#append)   | `(path: string, content: string) → bool` | appends, **creates the file if missing**         | <span className="status-badge verified">verified</span> |
| [`delete`](#delete)   | `(path: string) → bool` | true on success, false on missing or non-empty dir            | <span className="status-badge verified">verified</span> |
| [`exists`](#exists)   | `(path: string) → bool` | works on files and dirs, `""` → `true` (root)                 | <span className="status-badge verified">verified</span> |
| [`isdir`](#isdir)     | `(path: string) → bool` | true if path exists AND is a directory                        | <span className="status-badge verified">verified</span> |
| [`mkdir`](#mkdir)     | `(path: string) → bool` | **recursive**, idempotent on existing directory               | <span className="status-badge verified">verified</span> |
| [`listdir`](#listdir) | `(path?: string) → table \| nil` | array of `{name, isDirectory, isFile, size?}` records | <span className="status-badge verified">verified</span> |

---

## `read`

```lua
file.read(path: string) → string | nil
```

Returns the entire file contents as a Lua string. Binary-safe. Returns `nil` for missing files.

| Call | Result |
|---|---|
| `read("data.txt")`              | file content as string |
| `read("missing.txt")`           | `nil` (no error) |
| `read("../foo")`                | error: `"File path cannot contain '..'"` |
| `read("C:/Windows/win.ini")`    | absolute path bypasses sandbox, returns the file |
| `read()`                        | `"bad argument #1 to '?' (string expected, got no value)"` |
| `read(nil)`                     | `"bad argument #1 to '?' (string expected, got nil)"` |

```lua
local content = file.read("config.json")
if content then
    local parsed = decode_json(content)
end
```

---

## `write`

```lua
file.write(path: string, content: string) → bool
```

Writes `content` to `path`, **overwriting** any existing file. Returns `true` on success, `false` on silent failure (most commonly when the parent directory is missing).

| Call | Result |
|---|---|
| `write("file.txt", "x")`                        | `true`, file created or overwritten |
| `write("file.txt", "")`                         | `true`, empty file |
| `write("subdir/inner.txt", "x")`                | `false` if `subdir/` does not exist (silent) |
| `write("file.txt", nil)`                        | `"bad argument #2 to '?' (string expected, got nil)"` |

`write` is **binary-safe**:

```lua
file.write("payload.bin", string.char(0, 1, 2, 0xCA, 0xFE, 0xBA, 0xBE))
local back = file.read("payload.bin")
print(#back)
```

To create a file in a nested directory:

```lua
file.mkdir("logs/today")
file.write("logs/today/run.log", "...")
```

---

## `append`

```lua
file.append(path: string, content: string) → bool
```

Appends `content` to the end of the file. **Creates the file if it does not exist**, unlike `write` with a missing parent directory.

| Call | Result |
|---|---|
| `append("log.txt", "AAA"); append("log.txt", "BBB")` | file content becomes `"AAABBB"` |
| `append("brand_new.txt", "CCC")`                      | `true`, file created with content `"CCC"` |

```lua
local function log_line(line)
    file.append("session.log", string.format("[%d] %s\n",
        utility.GetTickCount(), line))
end

cheat.Register("onSlowUpdate", function()
    log_line("heartbeat")
end)
```

---

## `delete`

```lua
file.delete(path: string) → bool
```

Deletes a file or **empty** directory. Returns `true` on success, `false` on failure (missing path, non-empty directory).

| Call | Result |
|---|---|
| `delete("file.txt")`           | `true`, file removed |
| `delete("empty_dir")`          | `true`, directory removed |
| `delete("non_empty_dir")`      | `false`, directory still exists |
| `delete("missing_path")`       | `false` (silent) |
| `delete()`                     | `"bad argument #1 to '?' (string expected, got no value)"` |
| `delete(nil)`                  | `"bad argument #1 to '?' (string expected, got nil)"` |

:::warning No recursive delete
There is no built-in recursive directory removal. To delete a non-empty directory, walk it with `listdir` and delete each entry first:

```lua
local function rm_rf(path)
    if file.isdir(path) then
        for _, entry in ipairs(file.listdir(path) or {}) do
            rm_rf(path .. "/" .. entry.name)
        end
    end
    file.delete(path)
end
```
:::

---

## `exists`

```lua
file.exists(path: string) → bool
```

Returns `true` if anything (file or directory) is at `path`. `""` is treated as the sandbox root and always returns `true`.

| Call | Result |
|---|---|
| `exists("file.txt")`             | `true` if file exists |
| `exists("some_dir")`             | `true` if directory exists |
| `exists("missing")`              | `false` |
| `exists("")`                     | `true` (root) |
| `exists(123)`                    | `false` (numeric path silently false, no error) |
| `exists()`                       | `"bad argument #1 to '?' (string expected, got no value)"` |
| `exists(nil)`                    | `"bad argument #1 to '?' (string expected, got nil)"` |

---

## `isdir`

```lua
file.isdir(path: string) → bool
```

Returns `true` only if the path exists **and** points to a directory. Files and missing paths both return `false` without error.

| Call | Result |
|---|---|
| `isdir("some_dir")`     | `true` |
| `isdir("file.txt")`     | `false` |
| `isdir("missing")`      | `false` (no error) |
| `isdir(nil)`            | `"bad argument #1 to '?' (string expected, got nil)"` |

```lua
if file.isdir("logs") then

end
```

---

## `mkdir`

```lua
file.mkdir(path: string) → bool
```

Creates a directory. **Recursive**: `mkdir("a/b/c")` creates `a`, `a/b`, and `a/b/c` all at once. **Idempotent**: returns `true` if the directory already exists.

| Call | Result |
|---|---|
| `mkdir("new")`              | `true`, directory created |
| `mkdir("existing")`         | `true` (no-op, no error) |
| `mkdir("a/b/c")`            | `true`, all 3 levels created |
| `mkdir(nil)`                | `"bad argument #1 to '?' (string expected, got nil)"` |
| `isdir("a/b/c")` after      | `true` (verified) |

```lua
file.mkdir("cache/preset_v2")
file.write("cache/preset_v2/settings.json", json)
```

---

## `listdir`

```lua
file.listdir(path?: string) → table | nil
```

Lists the contents of a directory. With no arguments or `""`, lists the **sandbox root**.

Each entry in the returned array is a record:

| Field | Type | Meaning |
|---|---|---|
| `name`        | `string` | the entry's basename |
| `isDirectory` | `bool`   | `true` for subdirectories |
| `isFile`      | `bool`   | `true` for regular files |
| `size`        | `number` | byte size, **only present when `isFile == true`** |

Verified return shapes:

| Call | Result |
|---|---|
| `listdir("dir_with_3_files_1_subdir")` | array of 4 records |
| `listdir("empty_dir")`                  | `{}` (empty table, NOT nil) |
| `listdir("missing")`                    | `nil` |
| `listdir("file.txt")` (regular file)    | `nil` |
| `listdir()` or `listdir("")`            | sandbox root contents |

Example response (excerpt from a verify run, root listing):

```lua
{
  { name = "logo.png",                  isDirectory = false, isFile = true, size = 21816 },
  { name = "serotonin_api_dump_v2.json", isDirectory = false, isFile = true, size = 42954 },
  { name = "test",                      isDirectory = true,  isFile = false },

}
```

```lua
for _, entry in ipairs(file.listdir("logs") or {}) do
    if entry.isFile and entry.name:match("%.log$") then
        print(string.format("%-30s %d bytes", entry.name, entry.size))
    end
end
```

---

## Patterns

### Atomic-ish JSON config save
```lua
local function save_config(path, json)
    local tmp = path .. ".tmp"
    if file.write(tmp, json) then
        file.delete(path)

        if file.write(path, json) then
            file.delete(tmp)
            return true
        end
    end
    return false
end
```

### Recursive directory walk
```lua
local function walk(dir, fn)
    for _, entry in ipairs(file.listdir(dir) or {}) do
        local full = dir == "" and entry.name or (dir .. "/" .. entry.name)
        if entry.isDirectory then
            walk(full, fn)
        else
            fn(full, entry)
        end
    end
end

walk("", function(path, entry)
    print(path, entry.size)
end)
```

### Read-or-default
```lua
local function read_or(path, default)
    return file.read(path) or default
end

local cfg_text = read_or("settings.json", "{}")
```

### Logger with rotation
```lua
local LOG = "session.log"
local MAX = 1024 * 1024

local function log(line)
    local entry = file.listdir("")

    local size = 0
    for _, e in ipairs(entry or {}) do
        if e.name == LOG and e.isFile then size = e.size; break end
    end
    if size > MAX then
        file.delete(LOG .. ".old")

        local content = file.read(LOG)
        if content then file.write(LOG .. ".old", content) end
        file.delete(LOG)
    end
    file.append(LOG, string.format("[%d] %s\n", utility.GetTickCount(), line))
end
```

### Recursive delete (no built-in)
```lua
local function rm_rf(path)
    if file.isdir(path) then
        for _, entry in ipairs(file.listdir(path) or {}) do
            rm_rf(path .. "/" .. entry.name)
        end
    end
    file.delete(path)
end
```


<!-- ===== libraries/audio.md ===== -->

---
sidebar_position: 9
title: audio
---

# `audio`

Sound playback: system beep, WAV streaming, global stop. 3 canonical functions.

| | |
|---|---|
| **Functions** | 3 (8 with aliases) |
| **Verified live** | 3 of 3 |
| **Required event context** | none |
| **Side effects** | `Beep` and `PlaySound` produce audible output |

> **Aliases.** `Beep` has **two** forms (PascalCase + lowercase). `PlaySound` and `StopAll` each have **three** forms. See [Overview / Naming convention](../overview#naming-convention).

## Quick reference

| Function | Signature | Notes | Status |
|---|---|---|---|
| [`Beep`](#beep)         | `(freq_hz: number, duration_ms: number)` | system beep through Windows `Beep`, blocking | <span className="status-badge verified">verified</span> |
| [`PlaySound`](#playsound) | `(wavData: string, loop: bool, volume: number, pitch: number)` | works with valid WAV bytes, **crashes the cheat on non-WAV input** | <span className="status-badge verified">verified</span> |
| [`StopAll`](#stopall)   | `()`                                  | stop every currently-playing sound, returns `nil`, safe no-op when nothing plays | <span className="status-badge verified">verified</span> |

---

## `Beep`

```lua
audio.Beep(freq_hz: number, duration_ms: number)
```

Plays a single tone through the Windows `Beep` syscall. Returns `nil`. **Blocking**: the script waits until the beep finishes before continuing.

Verified live, all without crashing or raising:

| Call | Result |
|---|---|
| `audio.Beep(440, 50)`     | audible 440 Hz tone for 50 ms |
| `audio.Beep(0, 50)`       | no audible tone, `ok=true` |
| `audio.Beep(50000, 50)`   | inaudible (above hearing range), `ok=true` |
| `audio.Beep(440, 0)`      | `ok=true`, no perceivable tone |
| `audio.Beep(-1, 50)`      | `ok=true`, no perceivable tone |
| `audio.Beep("440", 50)`   | `ok=true`, **string-as-number coerced** |
| `audio.Beep()`            | `"bad argument #1 to '?' (number expected, got no value)"` |
| `audio.Beep(440)`         | `"bad argument #2 to '?' (number expected, got no value)"` |
| `audio.Beep(nil, 50)`     | `"bad argument #1 to '?' (number expected, got nil)"` |

```lua

audio.Beep(880, 30)

audio.Beep(400, 60)
audio.Beep(800, 60)
```

:::warning Beep is synchronous
Each call blocks the calling thread for `duration_ms`. Avoid long beeps on the `onPaint` event, the cheat will hitch one frame per beep.
:::

---

## `PlaySound`

```lua
audio.PlaySound(wavData: string, loop?: bool, volume?: number, pitch?: number)
```

Plays a WAV-format byte string asynchronously. The string is the raw bytes of a `.wav` file (RIFF header + PCM samples). Documented argument shape:

| Arg | Range | Meaning |
|---|---|---|
| `wavData` | string | full byte content of a WAV file (typical source: `file.read("clip.wav")`) |
| `loop`    | bool   | repeat after the clip finishes |
| `volume`  | `0..2` | `1.0` = original volume, `0` = silent, `>1` = amplified |
| `pitch`   | number | playback rate multiplier, `1.0` = original |

Verified live with a real `hit.wav` (22100 bytes, RIFF header), every combination played correctly:

| Call | Result |
|---|---|
| `PlaySound(wav, false, 1.0, 1.0)`     | normal playback |
| `PlaySound(wav, false, 0,   1.0)`     | silent (vol=0) |
| `PlaySound(wav, false, 2.0, 1.0)`     | amplified (vol=2) |
| `PlaySound(wav, false, 1.0, 0.5)`     | half-speed pitch |
| `PlaySound(wav, false, 1.0, 2.0)`     | double-speed pitch |
| `PlaySound(wav, true,  1.0, 1.0)`     | looping (stop with `audio.StopAll`) |
| `PlaySound()`                         | `"bad argument #1 (string expected, got no value)"` |
| `PlaySound(nil)`                      | `"bad argument #1 (string expected, got nil)"` |

:::danger Crashes the cheat on non-WAV input
Verified: passing **any string that is not a valid WAV file** to `PlaySound` crashes the cheat with a native SEH exception that `pcall` cannot catch. Confirmed crashers in our run:

- `audio.PlaySound("")`: empty string
- `audio.PlaySound("not-wav")`: short bogus
- `audio.PlaySound("x")`: single byte

The internal WAV loader does not validate the RIFF header before walking it. **Always pass real WAV bytes** read from `file.read` or `http.Get`. Never construct or splice WAV data inline unless you trust every byte.
:::

```lua

local wav = file.read("hit.wav")
if wav then
    audio.PlaySound(wav, false, 1.0, 1.0)
end
```

---

## `StopAll`

```lua
audio.StopAll()
```

Stops every sound currently playing. Returns `nil`. Verified live: safe no-op when no sound is playing.

```lua
cheat.Register("shutdown", function()
    audio.StopAll()
end)
```

---

## Patterns

### Hit-confirm beep on aim
```lua
local last_beep = 0

cheat.Register("onUpdate", function()
    local target = entity.GetTarget()
    if target and target.IsAlive then
        local now = utility.GetTickCount()
        if now - last_beep > 100 then
            audio.Beep(1200, 20)
            last_beep = now
        end
    end
end)
```

### Pre-loaded WAV cache
```lua
local SOUNDS = {}
for _, name in ipairs({"hit", "miss", "alert"}) do
    SOUNDS[name] = file.read(name .. ".wav")
end

local function play(name, vol)
    if SOUNDS[name] then
        audio.PlaySound(SOUNDS[name], false, vol or 1, 1)
    end
end
```

### Stop all on script unload
```lua
cheat.Register("shutdown", audio.StopAll)
```


<!-- ===== libraries/mouse.md ===== -->

---
sidebar_position: 10
title: mouse
---

# `mouse`

Synthetic mouse input + click-state read. 5 canonical functions.

| | |
|---|---|
| **Functions** | 5 (11 with aliases) |
| **Verified live** | 5 of 5 |
| **Required event context** | none |
| **Side effects** | `Click`, `Press`, `Release`, `Scroll` inject OS-level mouse input that the game and the OS see as real |

> **Aliases.** `Click`, `Press`, `Release`, `Scroll` each have **two** forms (PascalCase + lowercase). `IsClicked` has **three** forms (PascalCase / camelCase / snake_case). See [Overview / Naming convention](../overview#naming-convention).

> **Cursor query.** This library has no `GetPos` / `SetPos`. Use [`utility.GetMousePos`](./utility#getmousepos) and [`utility.MoveMouse`](./utility#movemouse) for cursor coordinates.

## Button identifiers, two different schemes

The cheat splits mouse-button arguments into **two registries**, with **different accepted values**. This was verified live: passing the wrong identifier to the wrong function gives a clear error.

### `IsClicked` registry, read-only state probe

| Form | Notes |
|---|---|
| `"left"`, `"LEFT"`, `"Left"`     | case-insensitive |
| `"right"`                        | |
| `"mouse4"`                       | side X1 button |
| `"mouse5"`                       | side X2 button |
| `0`, `1`, `2`                    | numeric, internal mapping |
| `"middle"`                       | ❌ not supported, use VK code `4` and the bool from a workaround |
| any other string                 | ❌ raises `"Unknown key or button name: '<lowercased>'"` |

### `Click` / `Press` / `Release` registry, synthetic input

This API does **not** accept the friendly `"left"` / `"right"` strings even though they are in the lookup table. It accepts only:

| Form | Maps to | Verified |
|---|---|---|
| `1` | `VK_LBUTTON` (left)   | ✅ |
| `2` | `VK_RBUTTON` (right)  | ✅ |
| `4` | `VK_MBUTTON` (middle) | ✅ |
| `5` | `VK_XBUTTON1` (= `"mouse4"`) | ✅ |
| `6` | `VK_XBUTTON2` (= `"mouse5"`) | ✅ |
| `"mouse4"`        | side X1 button | ✅ |
| `"mouse5"`        | side X2 button | ✅ |
| `"left"` / `"right"` | ❌ `"Invalid mouse button specified for Press"` (or `Click` / `Release` depending on the call) |
| `0`, `3`            | ❌ `"Invalid mouse button specified for ..."` |
| `"middle"`, `"lbutton"`, `"LMB"`, `"button1"`, etc. | ❌ `"Unknown key or button name: '<lowercased>'"` |

Recommended pattern, define the constants once and use them everywhere:

```lua
local MOUSE = {
    LEFT   = 1,
    RIGHT  = 2,
    MIDDLE = 4,
    X1     = 5,
    X2     = 6,
}

mouse.Click(MOUSE.LEFT)
if mouse.IsClicked("left") then ... end
```

## Quick reference

| Function | Signature | Notes | Status |
|---|---|---|---|
| [`Click`](#click)        | `(button: number \| "mouse4" \| "mouse5")` | press + release in one call (synthetic input) | <span className="status-badge verified">verified</span> |
| [`Press`](#press--release)  | `(button: number \| "mouse4" \| "mouse5")` | press the button, leave it held                | <span className="status-badge verified">verified</span> |
| [`Release`](#press--release) | `(button: number \| "mouse4" \| "mouse5")` | release a previously pressed button            | <span className="status-badge verified">verified</span> |
| [`Scroll`](#scroll)      | `(amount: number)`           | wheel scroll, positive = up                    | <span className="status-badge verified">verified</span> |
| [`IsClicked`](#isclicked) | `(button: string \| number) → bool` | true while the button is currently held | <span className="status-badge verified">verified</span> |

---

## `IsClicked`

```lua
mouse.IsClicked(button: string | number) → bool
```

Returns `true` while the named button is currently held.

Verified live with the [IsClicked registry](#isclicked-registry-read-only-state-probe) above.

```lua
cheat.Register("onUpdate", function()
    if mouse.IsClicked("left") then

    end
end)
```

---

## `Click`

```lua
mouse.Click(button: number | "mouse4" | "mouse5", delay_ms?: number)
```

Synthesizes a press-and-release of the named button. Optional `delay_ms` inserts a delay between the press and release halves (default ~0). Verified live: `mouse.Click(1)` produces an LMB click that downstream applications see as real.

```lua
mouse.Click(1)
mouse.Click(2)
mouse.Click(4)
mouse.Click("mouse4")
mouse.Click(1, 50)
```

:::warning OS-level input
This call goes through Windows synthetic-input APIs. The click is delivered to whichever window has focus, **including non-Roblox windows**. Make sure Roblox is the focused window before calling, or guard with [`utility.GetMenuState`](./utility#getmenustate).
:::

---

## `Press` / `Release`

```lua
mouse.Press(button: number | "mouse4" | "mouse5")
mouse.Release(button: number | "mouse4" | "mouse5")
```

`Press` holds the button down, `Release` lifts it. **Always pair them**, otherwise the button stays held until the next real OS event clears it. Verified live with both `Press(1)` / `Release(1)`, observable through `IsClicked("left")` becoming `true` between the two calls.

```lua

mouse.Press(2)

mouse.Release(2)
```

---

## `Scroll`

```lua
mouse.Scroll(amount: number)
```

Synthetic wheel scroll. Positive `amount` typically scrolls up, negative down. Verified live: `Scroll(120)`, `Scroll(-120)`, `Scroll(0)` all return `nil` cleanly. Magnitude follows OS wheel-delta convention (a single notch is usually `120`, but per-application interpretation varies).

```lua
mouse.Scroll(120)
mouse.Scroll(-360)
```

| Call | Result |
|---|---|
| `Scroll()`     | `"bad argument #1 to '?' (number expected, got no value)"` |
| `Scroll(nil)`  | `"bad argument #1 to '?' (number expected, got nil)"` |
| `Scroll("s")`  | `"bad argument #1 to '?' (number expected, got string)"` |

---

## Patterns

### Hold LMB while target is in crosshair
```lua
local was_holding = false

cheat.Register("onUpdate", function()
    local target = entity.GetTarget()
    local should_hold = target ~= nil and target.IsAlive

    if should_hold and not was_holding then
        mouse.Press(1)
        was_holding = true
    elseif not should_hold and was_holding then
        mouse.Release(1)
        was_holding = false
    end
end)

cheat.Register("shutdown", function()
    if was_holding then mouse.Release(1) end
end)
```

### Triggerbot with cooldown
```lua
local last_click = 0

cheat.Register("onUpdate", function()
    local target = entity.GetTarget()
    if not target or not target.IsAlive then return end

    local now = utility.GetTickCount()
    if now - last_click > 200 then
        mouse.Click(1)
        last_click = now
    end
end)
```

### Side-button hotkey via IsClicked
```lua
cheat.Register("onUpdate", function()
    if mouse.IsClicked("mouse4") then

    end
end)
```

### Map friendly names yourself
```lua
local MOUSE = { LEFT = 1, RIGHT = 2, MIDDLE = 4, X1 = 5, X2 = 6 }

local function click(name)
    mouse.Click(MOUSE[name:upper()] or error("unknown: "..name))
end

click("left"); click("right"); click("middle")
```


<!-- ===== libraries/keyboard.md ===== -->

---
sidebar_position: 11
title: keyboard
---

# `keyboard`

Synthetic keyboard input + key-state read. 4 canonical functions.

| | |
|---|---|
| **Functions** | 4 (9 with aliases) |
| **Verified live** | 4 of 4 |
| **Required event context** | none |
| **Side effects** | `Click`, `Press`, `Release` inject OS-level keystrokes that the game and the OS see as real |

> **Aliases.** `Click`, `Press`, `Release` each have **two** forms (PascalCase + lowercase). `IsPressed` has **three** forms. See [Overview / Naming convention](../overview#naming-convention).

## Key names

`IsPressed` (and the other functions, by convention) accept these forms, **case-insensitive** for letters and key names:

### Verified accepted

| Form | Example | Meaning |
|---|---|---|
| Single letter         | `"A"`, `"a"`            | the matching letter key (Roblox / Win32 VK) |
| Single digit          | `"1"`, `"5"`            | top-row digit |
| Function key          | `"F1"`, `"F12"`         | F-row |
| Named special key     | `"Space"`               | spacebar |
| Named special key     | `"Enter"`               | return / enter |
| Named special key     | `"Escape"`              | escape |
| Modifier (no L/R)     | `"Shift"`, `"Ctrl"`, `"Alt"` | any side, the cheat does not distinguish left/right |
| Windows VK code (number) | `0x41` (`= 65`)        | `VK_A` |
| Windows VK code (number) | `0x20`                 | `VK_SPACE` |
| Windows VK code (number) | `0x1B`                 | `VK_ESCAPE` |

### Verified rejected (`Unknown key or button name: '<lowercased>'`)

| Form | Use instead |
|---|---|
| `"Return"`        | `"Enter"`     |
| `"Esc"`           | `"Escape"`    |
| `"LeftShift"`, `"RightShift"`     | `"Shift"`     |
| `"LeftControl"`, `"RightControl"` | `"Ctrl"`      |
| `"LeftAlt"`, `"RightAlt"`         | `"Alt"`       |
| `" "` (single space char)         | `"Space"`     |

The cheat normalizes the input to lowercase before lookup (verified: `"LeftShift"` errors as `"'leftshift'"`).

## Quick reference

| Function | Signature | Notes | Status |
|---|---|---|---|
| [`Click`](#click)        | `(key: string \| number)` | press + release in one call (synthetic) | <span className="status-badge verified">verified</span> |
| [`Press`](#press--release)  | `(key: string \| number)` | press, leave held | <span className="status-badge verified">verified</span> |
| [`Release`](#press--release) | `(key: string \| number)` | release | <span className="status-badge verified">verified</span> |
| [`IsPressed`](#ispressed) | `(key: string \| number) → bool` | true while the key is currently held | <span className="status-badge verified">verified</span> |

All 4 functions verified live. `Press("Shift")` followed by `Release("Shift")` was confirmed observable through `IsPressed("Shift")` which read `true` between the two calls and `false` after.

---

## `IsPressed`

```lua
keyboard.IsPressed(key: string | number) → bool
```

Returns `true` while the named key is currently held.

Verified live (returned `bool` cleanly):

`"A"`, `"a"`, `"1"`, `"Space"`, `"Enter"`, `"Escape"`, `"Shift"`, `"Ctrl"`, `"Alt"`, `"F1"`, `"F12"`, `0x41`, `65`, `0x20`, `0x1B`.

Verified rejected:

| Call | Result |
|---|---|
| `IsPressed("Return")`        | `"Unknown key or button name: 'return'"` |
| `IsPressed("Esc")`           | `"Unknown key or button name: 'esc'"` |
| `IsPressed("LeftShift")`     | `"Unknown key or button name: 'leftshift'"` |
| `IsPressed("LeftControl")`   | `"Unknown key or button name: 'leftcontrol'"` |
| `IsPressed("LeftAlt")`       | `"Unknown key or button name: 'leftalt'"` |
| `IsPressed(" ")`             | `"Unknown key or button name: ' '"` |
| `IsPressed("garbage_key")`   | `"Unknown key or button name: 'garbage_key'"` |
| `IsPressed()`                | `"bad argument #1 to '?' (string expected, got no value)"` |
| `IsPressed(nil)`             | `"bad argument #1 to '?' (string expected, got nil)"` |

```lua
cheat.Register("onUpdate", function()
    if keyboard.IsPressed("Shift") and keyboard.IsPressed("E") then

    end
end)
```

---

## `Click`

```lua
keyboard.Click(key: string | number)
```

Synthetic press-and-release of the named key. Verified live with `keyboard.Click("Shift")` (`ok=true`, `ret=nil`, the modifier was momentarily pressed and released).

```lua
keyboard.Click("Space")
```

:::warning OS-level input
This call goes through Windows synthetic-input APIs. The keystroke is delivered to whichever window has focus, **including non-Roblox windows**. Make sure Roblox is the focused window before calling, or guard with [`utility.GetMenuState`](./utility#getmenustate).
:::

---

## `Press` / `Release`

```lua
keyboard.Press(key: string | number, delay_ms?: number)
keyboard.Release(key: string | number)
```

`Press` holds the key down, `Release` lifts it. **Always pair them**, otherwise the key stays held until the next real OS event clears it. Optional `delay_ms` on `Press` releases the key automatically after that many milliseconds (`keyboard.Press("W", 100)` is equivalent to `Press` + 100ms wait + `Release`).

Verified live: `keyboard.Press("Shift")` followed by a 5 ms delay and `keyboard.Release("Shift")` was observable through `keyboard.IsPressed("Shift")`:
- before: `false`
- after `Press`: `true`
- after `Release`: `false`

```lua

keyboard.Press("W")

keyboard.Release("W")
```

---

## Patterns

### Hold W while target is in front
```lua
local was_holding = false

cheat.Register("onUpdate", function()
    local target = entity.GetTarget()
    local should_hold = target ~= nil and target.IsAlive

    if should_hold and not was_holding then
        keyboard.Press("W")
        was_holding = true
    elseif not should_hold and was_holding then
        keyboard.Release("W")
        was_holding = false
    end
end)

cheat.Register("shutdown", function()
    if was_holding then keyboard.Release("W") end
end)
```

### Modifier-driven panic key
```lua
cheat.Register("onUpdate", function()
    if keyboard.IsPressed("F1") then

    end
end)
```

### Repeating keystroke (autotype)
```lua
local last_send = 0
cheat.Register("onUpdate", function()
    if keyboard.IsPressed("F2") then
        local now = utility.GetTickCount()
        if now - last_send > 250 then
            keyboard.Click("Space")
            last_send = now
        end
    end
end)
```


<!-- ===== libraries/http.md ===== -->

---
sidebar_position: 12
title: http
---

# `http`

Asynchronous HTTPS client. 2 canonical functions, single-word verb form (PascalCase + lowercase).

| | |
|---|---|
| **Functions** | 2 (4 with aliases) |
| **Verified live** | 2 of 2 |
| **Required event context** | none for the call itself; the callback fires later on the cheat's IO thread |
| **Side effects** | sends a network request from the user's IP |
| **Protocol** | HTTPS verified live, plain HTTP not tested |

> **Aliases.** Two-form (PascalCase + lowercase): `http.Get` / `http.get`, `http.Post` / `http.post`. See [Overview / Naming convention](../overview#naming-convention).

> **Async, fire-and-forget.** `Get` and `Post` return `nil` immediately. The response is delivered via the callback on a later cheat tick. There is no synchronous variant.

> **No status code, no response headers.** The callback receives a single argument: the response body as a Lua string. There is no way to read the HTTP status, content-type, or response headers from inside the callback.

## Quick reference

| Function | Signature | Notes | Status |
|---|---|---|---|
| [`Get`](#get)   | `(url: string, headers: table, callback: fn(body: string))` | all 3 args required, body delivered to callback | <span className="status-badge verified">verified</span> |
| [`Post`](#post) | `(url: string, headers: table, body: string, callback: fn(body: string))` | all 4 args required | <span className="status-badge verified">verified</span> |

---

## `Get`

```lua
http.Get(url: string, headers: table, callback: function)
```

Sends an HTTPS GET. **All three arguments are required**, including an empty headers table `{}`. The callback receives a single argument: the response body as a Lua string.

Verified live argument validation:

| Call | Result |
|---|---|
| `Get()`              | `"bad argument #1 to '?' (string expected, got no value)"` |
| `Get(url)`           | `"bad argument #2 to '?' (table expected, got no value)"` |
| `Get(url, {})`       | `"bad argument #3 to '?' (function expected, got no value)"` |
| `Get(url, {}, fn)`   | returns `nil`, callback fires later |

### Headers

The headers argument is a string-to-string Lua table. Keys are header names, values are header values. Verified live: `Get("https://httpbin.org/headers", {["X-Verify-Probe"]="serotonin-test"}, cb)` echoes `X-Verify-Probe: serotonin-test` back inside the response body. Use `{}` for no custom headers.

```lua
http.Get("https://api.example.com/v1/status", {
    ["Authorization"] = "Bearer " .. token,
    ["X-Client"]      = "mtc-script",
}, function(body)
    print(body and #body or "no response")
end)
```

### Status codes and errors

The callback **only receives the body string**. It cannot tell you the HTTP status or response headers.

Verified live behaviors:

| Server response | Callback gets |
|---|---|
| `200 OK` with body                      | the body as a string |
| `404 Not Found` with empty body         | empty string `""` |
| Bad host / DNS failure / network error  | **callback NEVER fires** (silently dropped, even after 30+ seconds) |

:::warning Implement your own timeout
Network-level failures (unreachable host, DNS failure, TLS error) drop the request silently with no callback invocation. If your code waits for a response, add a deadline:

```lua
local fired = false
local deadline = utility.GetTickCount() + 5000

http.Get(url, {}, function(body)
    fired = true
    handle(body)
end)

cheat.Register("onUpdate", function()
    if not fired and utility.GetTickCount() > deadline then
        fired = true
        handle(nil)
    end
end)
```
:::

---

## `Post`

```lua
http.Post(url: string, headers: table, body: string, callback: function)
```

Sends an HTTPS POST with a string body. **All four arguments are required**.

Verified live argument validation:

| Call | Result |
|---|---|
| `Post()`              | `"bad argument #1 to '?' (string expected, got no value)"` |
| `Post(url)`           | `"bad argument #2 to '?' (table expected, got no value)"` |

### Body and Content-Type

The body is sent verbatim. **Set `Content-Type` yourself** through the headers table; without it, servers may interpret the body as `application/x-www-form-urlencoded` by default.

Verified live with `httpbin.org/post`:

| Call | Server saw |
|---|---|
| `Post(url, {["Content-Type"]="application/json"}, '{"k":1}', cb)` | `Content-Type: application/json`, body echoed as JSON |
| `Post(url, {}, "raw_body_text", cb)` | server defaulted to `application/x-www-form-urlencoded`, body parsed as form |

```lua
local body = '{"event":"hit","ts":' .. utility.GetTickCount() .. '}'

http.Post("https://your-server/log", {
    ["Content-Type"]   = "application/json",
    ["Authorization"]  = "Bearer " .. token,
}, body, function(resp)

end)
```

### Same status / error pattern as Get

Network-level errors silently drop the callback, see [`Get` warning](#status-codes-and-errors). 404 / 500 / etc. fire the callback with whatever body the server returned (often empty).

---

## Patterns

### Wrap with timeout
```lua
local function http_get_with_timeout(url, timeout_ms, on_done)
    local fired = false
    local deadline = utility.GetTickCount() + timeout_ms
    http.Get(url, {}, function(body)
        if fired then return end
        fired = true
        on_done(body)
    end)
    cheat.Register("onUpdate", function()
        if not fired and utility.GetTickCount() > deadline then
            fired = true
            on_done(nil)
        end
    end)
end

http_get_with_timeout("https://api.example.com/version", 3000, function(body)
    if body then
        print("server says:", body)
    else
        print("timeout")
    end
end)
```

### POST with retry
```lua
local function post_with_retry(url, body, attempts_left)
    http.Post(url, {["Content-Type"]="application/json"}, body, function(resp)
        if resp and #resp > 0 then

        elseif attempts_left > 0 then
            post_with_retry(url, body, attempts_left - 1)
        end
    end)
end

post_with_retry("https://your-server/event", '{"k":"v"}', 3)
```

### Stream telemetry
```lua
local QUEUE = {}

cheat.Register("onSlowUpdate", function()
    if #QUEUE == 0 then return end
    local payload = table.concat(QUEUE, "\n")
    QUEUE = {}
    http.Post("https://your-server/telemetry",
        {["Content-Type"]="text/plain"}, payload, function() end)
end)

local function log_event(line)
    QUEUE[#QUEUE + 1] = string.format("[%d] %s",
        utility.GetTickCount(), line)
end
```

### Download a WAV and play it
```lua
http.Get("https://your-cdn/hit.wav", {}, function(body)
    if body and #body > 44 and body:sub(1, 4) == "RIFF" then
        audio.PlaySound(body, false, 1.0, 1.0)
    end
end)
```


<!-- ===== libraries/websocket.md ===== -->

---
sidebar_position: 13
title: websocket
---

# `websocket`

Asynchronous WebSocket client. 3 canonical functions, single-word verb form (PascalCase + lowercase).

| | |
|---|---|
| **Functions** | 3 (6 with aliases) |
| **Verified live** | 3 of 3 (signatures + `onError` event observed; full message roundtrip not achieved in our run, see notes) |
| **Required event context** | none for the call itself; callbacks fire later on the cheat's IO thread |
| **Side effects** | opens an outbound TCP/TLS connection from the user's IP, holds it open until `Close` |

> **Aliases.** Two-form (PascalCase + lowercase): `websocket.Connect` / `websocket.connect`, etc. See [Overview / Naming convention](../overview#naming-convention).

> **Callback table uses camelCase.** Verified live: only `onMessage`/`onOpen`/`onClose`/`onError` keys are dispatched. PascalCase (`OnError`) and snake_case (`on_error`) tables registered alongside the same connection received zero events.

## Quick reference

| Function | Signature | Notes | Status |
|---|---|---|---|
| [`Connect`](#connect) | `(url: string, callbacks: table) → id: number` | both args required, returns sequential numeric id even on bad URL (failure surfaces async via `onError`) | <span className="status-badge verified">verified</span> |
| [`Send`](#send)       | `(id: number, data: string)` | both args required, succeeds (returns `nil`) regardless of whether the connection is open yet | <span className="status-badge verified">verified</span> |
| [`Close`](#close)     | `(id: number)` | silently no-ops on unknown ids, returns `nil` | <span className="status-badge verified">verified</span> |

---

## Callback table

Pass a table of named functions as the second argument to `Connect`. The cheat looks up the keys in **camelCase only**:

| Key | When it fires | Argument |
|---|---|---|
| `onOpen`    | when the connection has been established                        | none documented |
| `onMessage` | when the server sends a message                                  | the message data as string (signature inferred, not roundtripped in our run) |
| `onClose`   | when the connection terminates cleanly                           | none documented |
| `onError`   | when the connection fails to establish or terminates abnormally  | error string (verified: `"Underlying Transport Error"` was delivered to `onError(msg)`) |

Verified by registering the same connection with three callback tables in PascalCase, camelCase, and snake_case naming styles. Only the camelCase table received the `onError` event. The PascalCase and snake_case tables received nothing.

```lua
local function on_open()         print("ws connected") end
local function on_message(msg)   print("ws got:", msg) end
local function on_close()        print("ws closed") end
local function on_error(err)     print("ws error:", err) end

local id = websocket.Connect("wss://echo.example.com", {
    onOpen    = on_open,
    onMessage = on_message,
    onClose   = on_close,
    onError   = on_error,
})
```

---

## `Connect`

```lua
websocket.Connect(url: string, callbacks: table) → id: number
```

Opens a WebSocket connection to `url`. **Both arguments are required.** Returns a numeric id used to address the connection in `Send` and `Close`.

The id is assigned **sequentially** by the cheat. In our run, four `Connect` calls returned `1, 2, 3, 4`.

Verified arg validation:

| Call | Result |
|---|---|
| `Connect()`                      | `"bad argument #1 to '?' (string expected, got no value)"` |
| `Connect("wss://...")`           | `"bad argument #2 to '?' (table expected, got no value)"` |
| `Connect("wss://invalid-host.invalid", {})` | sync `ok = true`, returns id `1`. Async: `onError("Underlying Transport Error")` fires later |

Network failure is **always asynchronous**. `Connect` returns an id even if the URL is unreachable; the failure is delivered through `onError`.

### Successful connect example

```lua
local function on_message(msg) print("server:", msg) end
local function on_open()       websocket.Send(my_id, "hello") end
local function on_close()      print("closed") end
local function on_error(err)   print("error:", err) end

local id = websocket.Connect("wss://your-server/socket", {
    onOpen    = on_open,
    onMessage = on_message,
    onClose   = on_close,
    onError   = on_error,
})
```

---

## `Send`

```lua
websocket.Send(id: number, data: string)
```

Sends `data` to the connection identified by `id`. Both arguments required.

Verified arg validation:

| Call | Result |
|---|---|
| `Send()`           | `"bad argument #1 to '?' (number expected, got no value)"` |
| `Send(id)`         | `"bad argument #2 to '?' (string expected, got no value)"` |
| `Send(id, "hi")`   | returns `nil`, accepted regardless of connection state |

`Send` returns `nil` even when the connection is not yet open or has already failed. There is no synchronous indicator that the message reached the wire. The only signal of failure is a later `onError` callback.

```lua
websocket.Send(id, "ping")
websocket.Send(id, '{"event":"hit","ts":' .. utility.GetTickCount() .. '}')
```

For binary frames, pass any Lua string. The `buffer` library is **not bound** in the current build (LuaJIT 2.0.3 lacks `string.buffer`), so build the bytes manually with `string.char` or `string.format`:

```lua
local payload = string.char(0xDE, 0xAD, 0xBE, 0xEF, 0xCA, 0xFE, 0xBA, 0xBE)
websocket.Send(id, payload)
```

---

## `Close`

```lua
websocket.Close(id: number)
```

Closes the connection identified by `id`. Returns `nil`. Silently no-ops on unknown ids:

| Call | Result |
|---|---|
| `Close()`         | `"bad argument #1 to '?' (number expected, got no value)"` |
| `Close(9999)`     | `nil` (no error, no callback fires) |
| `Close(valid_id)` | `nil`, `onClose` fires later |

```lua
cheat.Register("shutdown", function()
    if my_ws_id then websocket.Close(my_ws_id) end
end)
```

---

## Patterns

### Reconnect with backoff
```lua
local current_id = nil
local backoff_ms = 500

local function open(url)
    current_id = websocket.Connect(url, {
        onOpen = function()
            backoff_ms = 500
            print("ws open")
        end,
        onMessage = function(msg) handle(msg) end,
        onError   = function(err)
            print("ws error:", err)

            local target = utility.GetTickCount() + backoff_ms
            backoff_ms = math.min(backoff_ms * 2, 30000)
            cheat.Register("onUpdate", function()
                if utility.GetTickCount() >= target then
                    open(url)
                end
            end)
        end,
        onClose = function() print("ws closed") end,
    })
end

open("wss://your-server/socket")
```

### Send queue with batching
```lua
local id, queue, sending = nil, {}, false

local function flush()
    if not sending and #queue > 0 then
        for _, item in ipairs(queue) do websocket.Send(id, item) end
        queue = {}
    end
end

id = websocket.Connect("wss://your-server/events", {
    onOpen    = function() sending = false; flush() end,
    onMessage = function(msg) print(msg) end,
    onError   = function(err) sending = true end,
    onClose   = function() sending = true end,
})

local function send(s)
    queue[#queue + 1] = s
    flush()
end
```

### Per-frame heartbeat
```lua
local id = websocket.Connect("wss://your-server/socket", { onMessage = function() end })
local last_ping = 0

cheat.Register("onUpdate", function()
    local now = utility.GetTickCount()
    if now - last_ping > 10000 then
        websocket.Send(id, "ping")
        last_ping = now
    end
end)
```


<!-- ===== libraries/draw.md ===== -->

---
sidebar_position: 14
title: draw
---

# `draw`

2D rendering API for the cheat overlay. 18 canonical functions split into 13 drawing primitives and 5 utilities.

| | |
|---|---|
| **Functions** | 18 (46 with aliases) |
| **Verified live** | 18 of 18 |
| **Required event context** | `onPaint` for rendering primitives. Utilities (`GetScreenSize`, `GetTextSize`, `ComputeConvexHull`, `GetPartCorners`, `GetMesh`) work anywhere. |
| **Side effects** | overlays graphics on top of the Roblox window for one frame |

> **Aliases.** Two-form (PascalCase + lowercase) for single-word verbs (`Line` / `line`, `Rect` / `rect`, `Text` / `text`, etc.). Three-form (PascalCase / camelCase / snake_case) for multi-word names (`RectFilled` / `rectFilled` / `rect_filled`, `GetTextSize` / `getTextSize` / `get_text_size`). Aliases are distinct Lua callables, see [Overview / Naming convention](../overview#naming-convention).

> **Drawing primitives outside `onPaint` silently no-op.** Verified: `draw.Line` and friends called outside an `onPaint` callback return `nil` without raising and without rendering anything. Don't rely on this, always render from `onPaint`.

## Quick reference

### Drawing primitives (must be in `onPaint`)

| Function | Signature | Status |
|---|---|---|
| [`Line`](#line)                 | `(x1, y1, x2, y2, color: Color3, thickness?: number, alpha?: number)` | <span className="status-badge verified">verified</span> |
| [`Rect`](#rect--rectfilled)     | `(x, y, w, h, color: Color3, thickness?, rounding?, alpha?)` | <span className="status-badge verified">verified</span> |
| [`RectFilled`](#rect--rectfilled) | `(x, y, w, h, color: Color3, rounding?, alpha?)` | <span className="status-badge verified">verified</span> |
| [`Circle`](#circle--circlefilled) | `(x, y, r, color: Color3, thickness?, segments?, alpha?)` | <span className="status-badge verified">verified</span> |
| [`CircleFilled`](#circle--circlefilled) | `(x, y, r, color: Color3, segments?, alpha?)` | <span className="status-badge verified">verified</span> |
| [`Triangle`](#triangle--trianglefilled) | `(x1, y1, x2, y2, x3, y3, color: Color3, thickness?, alpha?)` | <span className="status-badge verified">verified</span> |
| [`TriangleFilled`](#triangle--trianglefilled) | `(x1, y1, x2, y2, x3, y3, color: Color3, alpha?)` | <span className="status-badge verified">verified</span> |
| [`Polyline`](#polyline)         | `(points: table, color: Color3, closed: bool, thickness: number, alpha?)` | <span className="status-badge verified">verified</span> |
| [`ConvexPolyFilled`](#convexpolyfilled) | `(points: table, color: Color3, alpha?)` | <span className="status-badge verified">verified</span> |
| [`Gradient`](#gradient)         | `(x, y, w, h, c1: Color3, c2: Color3, isHorizontal: bool, alpha1?, alpha2?)` | <span className="status-badge verified">verified</span> |
| [`Text`](#text--textoutlined)   | `(text: string, x, y, color: Color3, font?: string, alpha?: number)` | <span className="status-badge verified">verified</span> |
| [`TextOutlined`](#text--textoutlined) | `(text: string, x, y, color: Color3, font?: string, alpha?: number, size?: number)` | <span className="status-badge verified">verified</span> |
| [`Image`](#image)               | `(texId: number, x, y, w, h, color?: Color3, alpha?: number)` | <span className="status-badge verified">verified</span> |

### Utilities (work anywhere)

| Function | Signature | Status |
|---|---|---|
| [`GetScreenSize`](#getscreensize)   | `() → w: number, h: number` | <span className="status-badge verified">verified</span> |
| [`GetTextSize`](#gettextsize)       | `(text: string, font?: string) → w: number, h: number` | <span className="status-badge verified">verified</span> |
| [`ComputeConvexHull`](#computeconvexhull) | `(points: table) → table` | <span className="status-badge verified">verified</span> |
| [`GetPartCorners`](#getpartcorners) | `(part: Instance) → table` | <span className="status-badge verified">verified</span> |
| [`GetMesh`](#getmesh)               | `(part: Instance) → ?` | <span className="status-badge verified">verified</span> |

## Coordinate system

`(0, 0)` is the **top-left** corner of the Roblox window. `x` grows right, `y` grows down. Pixel units. The screen extents are `(w, h)` from [`GetScreenSize`](#getscreensize).

## Color and alpha

All drawing primitives expect a `Color3` userdata for the color argument, **not** packed RGBA ints. Use `Color3.fromRGB(r, g, b)` or `Color3.new(r, g, b)`. Alpha (where supported) is a separate trailing `0..1` argument.

## Fonts

Verified live by `draw.GetTextSize("Hello, World!", font)`:

| Font name (case-sensitive) | Width × Height of `"Hello, World!"` |
|---|---|
| `"ConsolasBold"`         | 104 × 15 |
| `"SmallestPixel"`        | 61 × 10 |
| `"Verdana"`              | 80 × 15 |
| `"Tahoma"`               | 71 × 15 |
| omit / pass nothing      | 71 × 15 (matches Tahoma, default font) |
| any unknown name (`"garbage_font"`) | 71 × 15 (silent fallback to default) |

Pass any other string and the cheat silently uses the default font.

---

## `Line`

```lua
draw.Line(x1: number, y1: number, x2: number, y2: number,
          color: Color3, thickness?: number, alpha?: number)
```

Draws a 1-frame line from `(x1, y1)` to `(x2, y2)`. `thickness` defaults to 1, `alpha` defaults to 1.

```lua
cheat.Register("onPaint", function()
    draw.Line(100, 100, 200, 100, Color3.fromRGB(255, 255, 255), 1, 1)
end)
```

---

## `Rect` / `RectFilled`

```lua
draw.Rect      (x, y, w, h, color: Color3, thickness?, rounding?, alpha?)
draw.RectFilled(x, y, w, h, color: Color3, rounding?, alpha?)
```

Outline (`Rect`) or filled (`RectFilled`) axis-aligned rectangle. `rounding` is the corner radius in pixels (`0` = sharp corners).

```lua
draw.Rect      ( 10,  10, 100, 30, Color3.new(1, 1, 1), 1, 0,   1)
draw.RectFilled( 10,  50, 100, 30, Color3.new(0.2, 0.2, 0.25), 4, 0.85)
```

---

## `Circle` / `CircleFilled`

```lua
draw.Circle      (x, y, r, color: Color3, thickness?, segments?, alpha?)
draw.CircleFilled(x, y, r, color: Color3, segments?, alpha?)
```

`segments` defaults to `12` (low-poly) per the original docs. Pass a higher value (e.g. `32` or `64`) for smoother circles.

```lua
draw.Circle      (250, 130, 15, Color3.fromRGB(50, 220, 50), 1, 32, 1)
draw.CircleFilled(280, 130, 12, Color3.fromRGB(70, 130, 240), 32, 0.7)
```

---

## `Triangle` / `TriangleFilled`

```lua
draw.Triangle      (x1, y1, x2, y2, x3, y3, color: Color3, thickness?, alpha?)
draw.TriangleFilled(x1, y1, x2, y2, x3, y3, color: Color3, alpha?)
```

```lua
draw.TriangleFilled(380, 100, 420, 100, 400, 140,
    Color3.fromRGB(255, 50, 50), 0.7)
```

---

## `Polyline`

```lua
draw.Polyline(points: table, color: Color3, closed: bool, thickness: number, alpha?)
```

Connects each consecutive pair of points with a line. `closed` connects the last point back to the first. `points` is an array of `{x, y}` 2-element tables.

```lua
draw.Polyline(
    {{440, 100}, {460, 140}, {480, 100}, {500, 140}},
    Color3.new(1, 1, 1), false, 1, 1)
```

---

## `ConvexPolyFilled`

```lua
draw.ConvexPolyFilled(points: table, color: Color3, alpha?)
```

Fills a convex polygon. The point list must be **convex and in order** (no self-intersection). Pair with [`ComputeConvexHull`](#computeconvexhull) when you have arbitrary input.

```lua
local pts = {{520, 100}, {570, 100}, {595, 140}, {545, 160}, {520, 140}}
draw.ConvexPolyFilled(pts, Color3.fromRGB(70, 130, 240), 0.7)
```

---

## `Gradient`

```lua
draw.Gradient(x, y, w, h,
              c1: Color3, c2: Color3,
              isHorizontal: bool,
              alpha1?: number, alpha2?: number)
```

Renders a 2-stop linear gradient inside the rectangle. `isHorizontal == true` blends left-to-right (c1 → c2), `false` blends top-to-bottom.

```lua
draw.Gradient(100, 200, 200, 30,
              Color3.fromRGB(255, 50, 50),
              Color3.fromRGB(70, 130, 240),
              true, 1, 1)
```

---

## `Text` / `TextOutlined`

```lua
draw.Text        (text: string, x: number, y: number, color: Color3, font?: string, alpha?: number, size?: number)
draw.TextOutlined(text: string, x: number, y: number, color: Color3, font?: string, alpha?: number, size?: number)
```

`Text` renders plain text. `TextOutlined` adds a 1-pixel dark outline around every character (more readable on noisy backgrounds, the default for HUD-style overlays).

`font` is one of the [verified font names](#fonts). Unknown names silently fall back to the default font.

`size` overrides the font's default pixel height. Omit (or pass `nil`) to use the font's native size.

```lua
draw.Text        ("FPS: 144", 10, 10, Color3.fromRGB(230, 230, 230), "ConsolasBold", 1)
draw.TextOutlined("AIM",      10, 30, Color3.fromRGB( 90, 220, 120), "Verdana",      1)
draw.TextOutlined("BIG",      10, 60, Color3.fromRGB(255, 255, 255), "Verdana",      1, 36)
```

---

## `Image`

```lua
draw.Image(texId: number, x: number, y: number, w: number, h: number,
           color?: Color3, alpha?: number)
```

Renders a previously-loaded texture by id. `color` is an optional tint applied to the texture (omit for no tint), `alpha` is an optional `0..1` opacity multiplier. Get a `texId` from [`utility.LoadImage`](./utility#loadimage).

Verified live with a real PNG (`logo.png`, 21816 bytes, loaded via `utility.LoadImage` → `texid = 1`):

| Call | Result |
|---|---|
| `Image(texid, x, y, w, h)`                                  | renders, no tint, no alpha override |
| `Image(texid, x, y, w, h, Color3.fromRGB(255, 60, 60))`      | renders tinted red |
| `Image(texid, x, y, w, h, Color3.new(0.5, 0.5, 1.0))`        | renders tinted; both `Color3` factories accepted |
| `Image(texid, x, y, w, h, Color3.new(1,1,1), 0.5)`           | renders at 50% alpha |
| `Image(texid, x, y, w, h, Color3.new(1,1,1), 0)`             | renders at 0% alpha (invisible, no error) |
| `Image(texid, x, y, w, h, Color3.new(1,1,1), 1, 0)`          | extra trailing args silently ignored |
| `Image(texid, x, y, w, h, 255)`                              | `"bad argument #6 to '?' (__color3_meta expected, got number)"`. Arg #6 must be a `Color3`, not raw RGBA ints |
| `Image(99999, x, y, w, h, Color3.new(1,1,1))`                | silent no-op (invalid texid does not raise, just renders nothing) |
| `Image(nil, x, y, w, h)`                                     | `"bad argument #1 to '?' (number expected, got nil)"` |
| `Image("x", x, y, w, h)`                                     | `"bad argument #1 to '?' (number expected, got string)"` |

:::warning Older docs had the wrong signature
The signature was previously reported as `(texId, x, y, w, h, r, g, b, a)` with raw RGBA bytes. **That is wrong** for this build. Argument `#6` is type-tagged `__color3_meta`, you must pass a real `Color3`. The fields after the rectangle are `(color, alpha)`, not `(r, g, b, a)`.
:::

```lua
local tex = utility.LoadImage(file.read("hud.png"))
if tex then
    cheat.Register("onPaint", function()
        draw.Image(tex, 16, 16, 64, 64)
        draw.Image(tex, 96, 16, 64, 64, Color3.fromRGB(255, 60, 60))
        draw.Image(tex, 16, 96, 64, 64, Color3.new(1, 1, 1), 0.5)
    end)
end
```

---

## `GetScreenSize`

```lua
draw.GetScreenSize() → w: number, h: number
```

Returns the Roblox window size in pixels as **two return values** (multi-return), not a table. Verified live: `(2048, 1208)` on a 2K windowed session. **Works inside or outside `onPaint`.** Functionally identical to [`cheat.GetWindowSize`](./cheat#getwindowsize).

```lua
local w, h = draw.GetScreenSize()
```

---

## `GetTextSize`

```lua
draw.GetTextSize(text: string, font?: string) → w: number, h: number
```

Returns the pixel size the given text would occupy when rendered with `Text` or `TextOutlined`. Verified live, see the [fonts table](#fonts) for measured values.

Verified arg behaviors:

| Call | Result |
|---|---|
| `GetTextSize("Hello, World!")`              | `(71, 15)` |
| `GetTextSize("Hello, World!", "ConsolasBold")` | `(104, 15)` |
| `GetTextSize("Hello, World!", "garbage_font")` | `(71, 15)` (silent default fallback) |
| `GetTextSize(123)`                          | returns single number `21`, the cheat coerces non-string args to their string form (`"123"`) and measures that |
| `GetTextSize()`                             | `"bad argument #1 (string expected, got no value)"` |
| `GetTextSize(nil)`                          | `"bad argument #1 (string expected, got nil)"` |

```lua
local w, h = draw.GetTextSize("ESP", "Verdana")
draw.Rect(10 - 2, 10 - 2, w + 4, h + 4, Color3.new(0, 0, 0), 1, 0, 0.5)
draw.Text("ESP", 10, 10, Color3.new(1, 1, 1), "Verdana", 1)
```

---

## `ComputeConvexHull`

```lua
draw.ComputeConvexHull(points: table) → table
```

Computes the 2D convex hull of a point set. `points` is a Lua array of `{x, y}` 2-element tables. Returns the hull in the **same shape** (array of `{x, y}`).

Verified live:

| Input | Result |
|---|---|
| 5 points (a small star arrangement) | 5-point hull (all input points are on the hull, returned in CW or CCW order) |
| `{}` (empty)              | `{}` |
| no arguments              | `{}` (silent, no error) |
| `nil`                     | `{}` (silent) |
| array of `Vector3`        | `{}` (Vector3 not accepted, returns empty) |

Use this before `ConvexPolyFilled` when you have arbitrary 2D points and need a convex outline:

```lua
local hull = draw.ComputeConvexHull({
    {100, 100}, {120, 90}, {140, 110}, {130, 130}, {110, 125}, {95, 115}
})
draw.ConvexPolyFilled(hull, Color3.fromRGB(255, 200, 50), 0.6)
```

---

## `GetPartCorners`

```lua
draw.GetPartCorners(part: Instance) → table of 8 Vector3
```

Returns the 8 **world-space** corners of a Roblox `BasePart`'s oriented bounding box, as `Vector3` userdata entries. The corners account for both `Size` and `Rotation` - a 45°-rotated part returns its true rotated corners, not an axis-aligned approximation.

The argument must be a Roblox-side `BasePart` Instance - not a userdata from `entity.GetParts()`. This is the function to use when you have a regular `Instance` (the cheat's part-cache `Part` userdata has its own [`GetPartCubeVertices`](../userdata/Part#getpartcubevertices) method).

:::info Coordinate space is world, not screen
The cheat developer's spec lists this function as returning "screen-space" corners. Verified live, that note is incorrect - `corners[1]` returns a `Vector3` userdata with `tostring` formatted as `"X.000000, Y.000000, Z.000000"` (Vector3-style), and the values match the part's world position (e.g. a `HumanoidRootPart` at world `(0, 3, 0)` returns corners around `(±0.5, 2..4, ±1)`). To draw an ESP box, project each corner with [`utility.WorldToScreen`](./utility#worldtoscreen).
:::

Verified arg shape:

| Call | Result |
|---|---|
| `GetPartCorners()`         | error: `"bad argument #1 (__instance expected, got no value)"` |
| `GetPartCorners(nil)`      | error: `"bad argument #1 (__instance expected, got nil)"` |
| `GetPartCorners("string")` | error: `"bad argument #1 (__instance expected, got string)"` |
| `GetPartCorners(workspace_basepart)` | `{ [1..8] = Vector3 }` |

Verified return on a `HumanoidRootPart` (Size = 2x2x1 stud, world position around `(0, 3, 0)`):

```
[1] = 0.500000, 2.096318, -1.000002
[2] = 0.500000, 2.096318,  1.000002
[3] = 0.500000, 4.096322, -1.000002
[4] = 0.500000, 4.096322,  1.000002
[5] = -0.500000, 2.096318, -1.000002
[6] = -0.500000, 2.096318,  1.000002
[7] = -0.500000, 4.096322, -1.000002
[8] = -0.500000, 4.096322,  1.000002
```

Corner ordering is consistent across calls. To draw a wireframe box, pair indices on opposite faces of the cuboid (1↔5, 2↔6, 3↔7, 4↔8 for vertical edges; 1↔2, 3↔4, 5↔6, 7↔8 for one horizontal axis; 1↔3, 2↔4, 5↔7, 6↔8 for the other).

```lua
local corners = draw.GetPartCorners(part_inst)
local edges = {
    {1,2},{3,4},{5,6},{7,8},   -- z-axis edges
    {1,3},{2,4},{5,7},{6,8},   -- y-axis edges
    {1,5},{2,6},{3,7},{4,8},   -- x-axis edges
}
local color = Color3.fromRGB(255, 200, 0)
for _, e in ipairs(edges) do
    local a = corners[e[1]]
    local b = corners[e[2]]
    local ax, ay, ona = utility.WorldToScreen(a)
    local bx, by, onb = utility.WorldToScreen(b)
    if ona and onb then
        draw.Line(ax, ay, bx, by, color, 1)
    end
end
```

---

## `GetMesh`

```lua
draw.GetMesh(part: Instance) → ?
```

Returns mesh data for a Roblox `MeshPart`. **Requires a `MeshPart`** - passing a regular `Part` raises the verified runtime error.

Verified arg shape:

| Call | Result |
|---|---|
| `GetMesh()`         | error: `"bad argument #1 to '?' (userdata expected, got no value)"` |
| `GetMesh(part)` (Part, not MeshPart) | error: `"Expected a MeshPart instance."` |
| `GetMesh(meshpart)` | mesh data table (shape pending a follow-up probe with a guaranteed-loaded MeshPart) |

```lua
local kid = game.Workspace:FindFirstChild("MyMeshPart")
if kid and kid.ClassName == "MeshPart" then
    local mesh = draw.GetMesh(kid)
    if mesh then
    end
end
```

---

## Patterns

### Anchored HUD with `GetScreenSize`
```lua
cheat.Register("onPaint", function()
    local W, H = draw.GetScreenSize()
    draw.RectFilled(W - 220, H - 80, 210, 70, Color3.new(0.1, 0.1, 0.12), 4, 0.85)
    draw.TextOutlined("MTC v0.1",        W - 212, H - 74, Color3.new(1, 1, 1), "ConsolasBold", 1)
    draw.TextOutlined(string.format("FPS %.0f", 1 / utility.GetDeltaTime()),
        W - 212, H - 56, Color3.new(0.6, 1, 0.6), "ConsolasBold", 1)
end)
```

### Centered text helper
```lua
local function draw_text_centered(text, cx, cy, color, font)
    local w, h = draw.GetTextSize(text, font)
    draw.TextOutlined(text, cx - w * 0.5, cy - h * 0.5, color, font, 1)
end
```

### Skeleton ESP with bones
```lua
local LIMBS = {
    { "Head", "UpperTorso" }, { "UpperTorso", "LowerTorso" },
    { "UpperTorso", "LeftUpperArm" }, { "UpperTorso", "RightUpperArm" },
    { "LowerTorso", "LeftUpperLeg" }, { "LowerTorso", "RightUpperLeg" },
}

cheat.Register("onPaint", function()
    for _, p in ipairs(entity.GetPlayers(true)) do
        if p.IsAlive and p.IsVisible then
            for _, pair in ipairs(LIMBS) do
                local a = p:GetBonePosition(pair[1])
                local b = p:GetBonePosition(pair[2])
                local sa = { utility.WorldToScreen(a) }
                local sb = { utility.WorldToScreen(b) }
                if sa[3] and sb[3] then
                    draw.Line(sa[1], sa[2], sb[1], sb[2],
                        Color3.fromRGB(220, 90, 90), 1, 1)
                end
            end
        end
    end
end)
```

### Box ESP from `GetPartCorners`
```lua
cheat.Register("onPaint", function()
    for _, p in ipairs(entity.GetPlayers(true)) do
        if not p.IsAlive then goto continue end
        local hrp = p:GetBoneInstance("HumanoidRootPart")
        if not hrp then goto continue end

        local corners = draw.GetPartCorners(hrp)
        if not corners then goto continue end

        local sx, sy = {}, {}
        for i, c in ipairs(corners) do
            local x, y, on = utility.WorldToScreen(c)
            if not on then goto continue end
            sx[i], sy[i] = x, y
        end
        for i = 1, 8 do
            local j = i + 1; if j > 8 then j = 1 end
            if sx[i] and sx[j] then
                draw.Line(sx[i], sy[i], sx[j], sy[j],
                    Color3.fromRGB(255, 255, 0), 1, 1)
            end
        end
        ::continue::
    end
end)
```

### Convex polygon from arbitrary points
```lua
local function draw_polygon(points, color)
    local hull = draw.ComputeConvexHull(points)
    if hull and #hull >= 3 then
        draw.ConvexPolyFilled(hull, color, 0.6)
    end
end
```


<!-- ===== libraries/ui.md ===== -->

---
sidebar_position: 15
title: ui
---

# `ui`

In-game cheat menu builder. 16 canonical functions: 12 builders + 4 state operations.

| | |
|---|---|
| **Functions** | 16 (48 with aliases) |
| **Verified live** | 16 of 16 |
| **Required event context** | none for builders, none for `GetValue` / `SetValue` |
| **Side effects** | adds tabs, containers, and widgets to the cheat menu (persist for the script lifetime, removed when the script unloads) |

> **Aliases.** Every `ui.*` function has **three** forms: PascalCase / camelCase / snake_case. `ui.NewCheckbox` / `ui.newCheckbox` / `ui.new_checkbox`. All distinct callables (`f1 == f2` is `false`), see [Overview / Naming convention](../overview#naming-convention).

> **No Unregister API.** Once a tab / container / widget is created with `ui.New*`, it persists until the script unloads. Re-running a script (without a Roblox restart) will repopulate the same tab and **stack** new callbacks on top of old ones. Always guard with an `_ALREADY_LOADED` flag.

> **Widget state is wiped on script unload.** Verified live: after `Unload`, the previously-created widgets disappear and the next script run starts fresh. Persistent values (saved hotkeys, etc.) need to be written to `file.write` and reloaded.

## Pipeline

```
NewTab("MyTab", "My Tab")
    └── NewContainer("MyTab", "GroupA", "Group A")
            ├── NewCheckbox("MyTab", "GroupA", "Enable")
            ├── NewSliderInt("MyTab", "GroupA", "Speed", 0, 100)
            ├── NewDropdown("MyTab", "GroupA", "Mode", { "easy", "hard" })
            └── ...
```

Every widget is addressed by its `(tab, container, label)` triple in `GetValue` / `SetValue` / `SetVisibility`.

## Quick reference

### Builders (returns)

| Function | Signature | Returns | Status |
|---|---|---|---|
| [`NewTab`](#newtab--newcontainer)         | `(tab: string, label: string)`                                | `nil`   | <span className="status-badge verified">verified</span> |
| [`NewContainer`](#newtab--newcontainer)   | `(tab: string, container: string, label: string)`              | `nil`   | <span className="status-badge verified">verified</span> |
| [`NewCheckbox`](#newcheckbox)             | `(tab, container, label)`                                      | `id: number` | <span className="status-badge verified">verified</span> |
| [`NewButton`](#newbutton)                 | `(tab, container, label, callback: function)`                  | `id: number` | <span className="status-badge verified">verified</span> |
| [`NewSliderInt`](#newsliderint--newsliderfloat) | `(tab, container, label, min: number, max: number)`     | `id: number` | <span className="status-badge verified">verified</span> |
| [`NewSliderFloat`](#newsliderint--newsliderfloat) | `(tab, container, label, min: number, max: number)`   | `id: number` | <span className="status-badge verified">verified</span> |
| [`NewInputText`](#newinputtext)           | `(tab, container, label)`                                      | `id: number` | <span className="status-badge verified">verified</span> |
| [`NewDropdown`](#newdropdown--newlistbox)  | `(tab, container, label, options: table)`                     | `id: number` | <span className="status-badge verified">verified</span> |
| [`NewListbox`](#newdropdown--newlistbox)   | `(tab, container, label, options: table)`                     | `id: number` | <span className="status-badge verified">verified</span> |
| [`NewMultiselect`](#newmultiselect)       | `(tab, container, label, options: table)`                      | `id: number` | <span className="status-badge verified">verified</span> |
| [`NewColorpicker`](#newcolorpicker)       | `(tab, container, label)`                                      | `id: number` | <span className="status-badge verified">verified</span> |
| [`NewHotkey`](#newhotkey)                 | `(tab, container, label)`                                      | `id: number` | <span className="status-badge verified">verified</span> |

### State

| Function | Signature | Notes | Status |
|---|---|---|---|
| [`GetValue`](#getvalue--setvalue)       | `(tab, container, label) → value`     | value type depends on widget, see [value table](#value-types-by-widget) | <span className="status-badge verified">verified</span> |
| [`SetValue`](#getvalue--setvalue)       | `(tab, container, label, value)`      | value type must match widget                                            | <span className="status-badge verified">verified</span> |
| [`GetHotkey`](#gethotkey)               | `(tab, container, label) → table`     | returns `{key, key_name, mode}`                                         | <span className="status-badge verified">verified</span> |
| [`SetVisibility`](#setvisibility)       | `(tab, container, label, visible: bool)` | hides or shows a specific widget                                     | <span className="status-badge verified">verified</span> |

## Value types by widget

| Widget | `GetValue` returns | `SetValue` accepts |
|---|---|---|
| `NewCheckbox`     | `bool`                                                                    | `bool` |
| `NewButton`       | `nil` (buttons have no stored value, only the callback fires)             | n/a (use the callback) |
| `NewSliderInt`    | `number` (integer)                                                        | `number` |
| `NewSliderFloat`  | `number` (float)                                                          | `number` |
| `NewInputText`    | `string`                                                                  | `string` |
| `NewDropdown`     | `number` (1-based index into the options table, `0` means no selection)   | `number` (index) |
| `NewListbox`      | `number` (same shape as Dropdown)                                          | `number` (index) |
| `NewMultiselect`  | `table` `{[1]=bool, [2]=bool, [3]=bool}` (one bool per option position)   | `table` of bools |
| `NewColorpicker`  | `table` `{r=int, g=int, b=int, a=int}` (each `0..255`)                    | `table` `{r=, g=, b=, a=}` (NOT `Color3`) |
| `NewHotkey`       | `bool` (`true` while the bound key is currently held)                     | `number` (Windows VK code, e.g. `119` for F8) |

:::warning Dropdown / Listbox use indices, not strings
`SetValue("MyTab", "GroupA", "Mode", "easy")` raises `"bad argument #4 to '?' (number expected, got string)"`. You must pass the **integer index** of the desired option (1-based, with the order matching the `options` table you passed to `NewDropdown`). Same for `NewListbox`.
:::

:::warning Colorpicker uses a plain table, not `Color3`
`SetValue(..., Color3.fromRGB(r, g, b))` is silently accepted but does nothing (the displayed value stays at the default). Pass `{ r=255, g=80, b=40, a=255 }` instead, integer channels in 0..255.
:::

---

## `NewTab` / `NewContainer`

```lua
ui.NewTab(tab: string, label: string)
ui.NewContainer(tab: string, container: string, label: string)
```

Creates an addressable container in the cheat menu. Both arguments to `NewTab` are required (`label` is **not optional**), all three to `NewContainer` are required. Returns `nil`.

Verified live:

| Call | Result |
|---|---|
| `NewTab("MyTab", "My Tab")`                  | tab created, returns `nil` |
| `NewTab("MyTab")`                            | `"bad argument #2 (string expected, got no value)"` |
| `NewTab("MyTab", "Re-create")` (already exists) | silently OK, no error |
| `NewContainer("MyTab", "GroupA", "Group A")` | container created, returns `nil` |
| `NewContainer("MyTab", "GroupA")`            | `"bad argument #3 (string expected, got no value)"` |

Use the same `tab` string in all subsequent `NewContainer` / `NewWidget` calls to attach to the same tab.

---

## `NewCheckbox`

```lua
ui.NewCheckbox(tab: string, container: string, label: string) → id: number
```

Creates a labelled bool toggle. Default value is `false`.

```lua
ui.NewCheckbox("MyTab", "GroupA", "ESP On")
ui.SetValue   ("MyTab", "GroupA", "ESP On", true)

cheat.Register("onUpdate", function()
    if ui.GetValue("MyTab", "GroupA", "ESP On") then

    end
end)
```

---

## `NewButton`

```lua
ui.NewButton(tab: string, container: string, label: string, callback: function) → id: number
```

Creates a clickable button. **The callback argument is required**, `NewButton(tab, container, label)` raises `"bad argument #4 (function expected, got no value)"`. The callback fires once per click.

`GetValue` on a button returns `nil` (buttons have no stored value).

```lua
ui.NewButton("MyTab", "GroupA", "Reset Settings", function()

    file.delete("settings.json")
end)
```

---

## `NewSliderInt` / `NewSliderFloat`

```lua
ui.NewSliderInt  (tab, container, label, min: number, max: number) → id: number
ui.NewSliderFloat(tab, container, label, min: number, max: number) → id: number
```

Numeric sliders. `SliderInt` clamps to integer values, `SliderFloat` accepts fractional. Default value is `min` (verified: a slider with `min=0` defaults to `0`).

```lua
ui.NewSliderInt  ("MyTab", "GroupA", "Speed", 0, 100)
ui.NewSliderFloat("MyTab", "GroupA", "Smoothing", 0.0, 1.0)

ui.SetValue("MyTab", "GroupA", "Speed", 42)
ui.SetValue("MyTab", "GroupA", "Smoothing", 0.5)
```

---

## `NewInputText`

```lua
ui.NewInputText(tab: string, container: string, label: string) → id: number
```

Single-line text input. Default value is `""`.

```lua
ui.NewInputText("MyTab", "GroupA", "Server URL")
ui.SetValue    ("MyTab", "GroupA", "Server URL", "https://api.example.com")
```

---

## `NewDropdown` / `NewListbox`

```lua
ui.NewDropdown(tab, container, label, options: table) → id: number
ui.NewListbox (tab, container, label, options: table) → id: number
```

Single-select widgets. `options` is a Lua array of strings. Default `GetValue` returns `0` (no selection). `SetValue` takes the **1-based integer index** into `options`, **not the option string**.

```lua
ui.NewDropdown("MyTab", "GroupA", "Mode", { "Casual", "Ranked", "Practice" })
ui.SetValue   ("MyTab", "GroupA", "Mode", 2)

local idx = ui.GetValue("MyTab", "GroupA", "Mode")
local options = { "Casual", "Ranked", "Practice" }
print("current mode:", options[idx])
```

---

## `NewMultiselect`

```lua
ui.NewMultiselect(tab, container, label, options: table) → id: number
```

Multi-select widget. Default `GetValue` returns a Lua table with one `bool` per option position: `{ [1]=false, [2]=false, [3]=false }`.

`SetValue` accepts a table of bools indexed by **option position** (1-based):

```lua
ui.NewMultiselect("MyTab", "GroupA", "Targets", { "Players", "NPCs", "Vehicles" })
ui.SetValue("MyTab", "GroupA", "Targets", { true, false, true })

local sel = ui.GetValue("MyTab", "GroupA", "Targets")
if sel[1] then
if sel[3] then
```

---

## `NewColorpicker`

```lua
ui.NewColorpicker(tab, container, label) → id: number
```

RGBA color picker. Default `GetValue` returns `{ r=255, g=255, b=255, a=255 }` (white, fully opaque). Channel values are integers in `0..255`.

`SetValue` requires a Lua table of the same shape, **not a `Color3` userdata**.

```lua
ui.NewColorpicker("MyTab", "GroupA", "ESP Color")
ui.SetValue       ("MyTab", "GroupA", "ESP Color", { r = 255, g = 80, b = 40, a = 255 })

local c = ui.GetValue("MyTab", "GroupA", "ESP Color")
draw.RectFilled(10, 10, 50, 50, Color3.fromRGB(c.r, c.g, c.b), 0, c.a / 255)
```

---

## `NewHotkey`

```lua
ui.NewHotkey(tab: string, container: string, label: string) → id: number
```

Hotkey binding widget. Two ways to read the state:

- [`GetValue`](#getvalue--setvalue) returns a `bool` indicating whether the bound key is currently held.
- [`GetHotkey`](#gethotkey) returns the binding as a table `{key, key_name, mode}`.

`SetValue` accepts a Windows Virtual Key code (number), e.g. `119` for `VK_F8`. Common codes:

| Key | VK code |
|---|---|
| Letters `A-Z`     | `0x41 .. 0x5A` (`65..90`) |
| Digits `0-9`      | `0x30 .. 0x39` (`48..57`) |
| `F1..F12`         | `0x70 .. 0x7B` (`112..123`) |
| `Space`           | `0x20` (32) |
| `Escape`          | `0x1B` (27) |
| `Enter`           | `0x0D` (13) |
| `LMB`             | `0x01` (1) |
| `RMB`             | `0x02` (2) |
| `MMB`             | `0x04` (4) |

```lua
ui.NewHotkey("MyTab", "GroupA", "Panic")
ui.SetValue ("MyTab", "GroupA", "Panic", 0x70)

cheat.Register("onUpdate", function()
    if ui.GetValue("MyTab", "GroupA", "Panic") then

    end
end)
```

---

## `GetValue` / `SetValue`

```lua
ui.GetValue(tab: string, container: string, label: string) → any
ui.SetValue(tab: string, container: string, label: string, value: any)
```

Reads / writes a widget's current value. Both functions take the `(tab, container, label)` triple to address a widget. The accepted / returned value type depends on the widget kind, see the [value table](#value-types-by-widget).

`SetValue` returns `nil`. Argument-type mismatches raise standard Lua errors:

| Call | Result |
|---|---|
| `SetValue(tab, container, "MySliderInt", "x")`    | `"bad argument #4 to '?' (number expected, got string)"` |
| `SetValue(tab, container, "MyDropdown", "label")` | `"bad argument #4 to '?' (number expected, got string)"` |

Setting a value that is the **wrong shape but the right type** (e.g. a `Color3` for a Colorpicker, or a string-keyed table for Multiselect) is silently accepted but does **not** change the displayed value. Always match the schema in the [value table](#value-types-by-widget).

```lua

local function snapshot(tab, container, labels)
    local out = {}
    for _, label in ipairs(labels) do
        out[label] = ui.GetValue(tab, container, label)
    end
    return out
end
```

---

## `GetHotkey`

```lua
ui.GetHotkey(tab: string, container: string, label: string) → table
```

Returns the current binding of a hotkey widget as a table:

| Field | Type | Meaning |
|---|---|---|
| `key`      | `number` | Windows VK code, `0` if unbound |
| `key_name` | `string` | display name, e.g. `"F8"`, `"LMB"`, `"Unbound"` |
| `mode`     | `number` | trigger mode (`0` = on hold, observed value) |

Verified default state of a freshly-created hotkey: `{ key=0, key_name="Unbound", mode=0 }`.

```lua
local hk = ui.GetHotkey("MyTab", "GroupA", "Panic")
draw.Text(string.format("Panic: %s", hk.key_name), 10, 10,
    Color3.new(1, 1, 1), "ConsolasBold", 1)
```

---

## `SetVisibility`

```lua
ui.SetVisibility(tab: string, container: string, label: string, visible: bool)
```

Shows or hides a specific widget. The `label` argument (`#3`) is **the widget label**, not the container. Verified live: passing a bool at arg `#3` raises `"bad argument #3 (string expected, got boolean)"`.

```lua
ui.NewCheckbox("MyTab", "GroupA", "Advanced Mode")
ui.NewSliderInt("MyTab", "GroupA", "Advanced Multiplier", 1, 10)

cheat.Register("onUpdate", function()
    local advanced = ui.GetValue("MyTab", "GroupA", "Advanced Mode")
    ui.SetVisibility("MyTab", "GroupA", "Advanced Multiplier", advanced)
end)
```

---

## Patterns

### Idempotent script bootstrap
```lua
if not _MTC_UI_BUILT then
    _MTC_UI_BUILT = true

    ui.NewTab("MTC", "MTC")
    ui.NewContainer("MTC", "Visuals", "Visuals")

    ui.NewCheckbox    ("MTC", "Visuals", "Box ESP")
    ui.NewSliderFloat ("MTC", "Visuals", "Box Thickness", 0.5, 4.0)
    ui.NewColorpicker ("MTC", "Visuals", "Box Color")
    ui.NewHotkey      ("MTC", "Visuals", "Toggle ESP")

    ui.NewContainer("MTC", "Aim", "Aim")
    ui.NewCheckbox  ("MTC", "Aim", "Aim Assist")
    ui.NewSliderInt ("MTC", "Aim", "FOV", 0, 180)
    ui.NewDropdown  ("MTC", "Aim", "Bone", { "Head", "UpperTorso", "HumanoidRootPart" })
end
```

### Read settings every frame
```lua
local function snapshot()
    local s = {}
    s.box_on    = ui.GetValue("MTC", "Visuals", "Box ESP")
    s.thickness = ui.GetValue("MTC", "Visuals", "Box Thickness")
    s.color     = ui.GetValue("MTC", "Visuals", "Box Color")
    s.aim_on    = ui.GetValue("MTC", "Aim", "Aim Assist")
    s.fov       = ui.GetValue("MTC", "Aim", "FOV")
    s.bone_idx  = ui.GetValue("MTC", "Aim", "Bone")
    s.toggle    = ui.GetValue("MTC", "Visuals", "Toggle ESP")
    return s
end

cheat.Register("onPaint", function()
    local s = snapshot()
    if not s.box_on then return end
    local color = Color3.fromRGB(s.color.r, s.color.g, s.color.b)

end)
```

### Persist UI state to disk
```lua
local CONFIG_PATH = "mtc_settings.json"

local function save()
    local s = {
        box_on    = ui.GetValue("MTC", "Visuals", "Box ESP"),
        thickness = ui.GetValue("MTC", "Visuals", "Box Thickness"),
        color     = ui.GetValue("MTC", "Visuals", "Box Color"),
    }

    local parts = {}
    for k, v in pairs(s) do parts[#parts+1] = string.format('%q:%s', k, tostring(v)) end
    file.write(CONFIG_PATH, "{" .. table.concat(parts, ",") .. "}")
end

ui.NewButton("MTC", "Visuals", "Save", save)

cheat.Register("shutdown", save)
```

### Conditional widget visibility
```lua
ui.NewCheckbox("MTC", "Aim", "Show Advanced")
local advanced_widgets = { "FOV Speed", "Smoothing", "Snap Factor" }

cheat.Register("onUpdate", function()
    local show = ui.GetValue("MTC", "Aim", "Show Advanced")
    for _, label in ipairs(advanced_widgets) do
        ui.SetVisibility("MTC", "Aim", label, show)
    end
end)
```


<!-- ===== userdata/Vector3.md ===== -->

---
sidebar_position: 1
title: Vector3
---

# `Vector3`

3-component float vector. Used everywhere positions, sizes, velocities or world-space directions appear (`entity.Position`, `:GetBonePosition`, `game.CameraPosition`, `BasePart.Size`, etc.).

| | |
|---|---|
| **Static functions** | 12 (1 constructor + 11 utilities) |
| **Static constants** | 5 (`zero`, `one`, `xAxis`, `yAxis`, `zAxis`) |
| **Instance fields** | `X`, `Y`, `Z`, `Magnitude`, `Unit` |
| **Instance methods** | 11 (same set as static utilities, both call styles supported) |
| **Operators** | `+`, `-`, `*scalar`, `/scalar`, unary `-` |

> **Aliases.** Most methods have **two** forms (PascalCase + lowercase): `Vector3.Dot` / `Vector3.dot`. Only `new` is single-form. See [Overview / Naming convention](../overview#naming-convention).

> **`==` is identity-only.** `Vector3.new(1,2,3) == Vector3.new(1,2,3)` returns `false`. The metatable's `__eq` does not implement value-equality. Use [`:FuzzyEq(other)`](#fuzzyeq) for value comparison. The pre-allocated singletons (`Vector3.zero`, `.one`, `.xAxis`, `.yAxis`, `.zAxis`) are identity-equal to themselves: `Vector3.zero == Vector3.zero` is `true`, but `Vector3.zero == Vector3.new(0, 0, 0)` is `false` because `new()` always returns a fresh userdata.

## Quick reference

### Static `Vector3.*`

| Name | Signature | Notes | Status |
|---|---|---|---|
| [`new`](#new)         | `(x?, y?, z?) → Vector3`              | construct from up to 3 numbers, missing args default to 0 | <span className="status-badge verified">verified</span> |
| [`zero`](#constants)  | `Vector3` constant `(0, 0, 0)`        | identity for addition                                     | <span className="status-badge verified">verified</span> |
| [`one`](#constants)   | `Vector3` constant `(1, 1, 1)`        |                                                           | <span className="status-badge verified">verified</span> |
| [`xAxis`](#constants) | `Vector3` constant `(1, 0, 0)`        |                                                           | <span className="status-badge verified">verified</span> |
| [`yAxis`](#constants) | `Vector3` constant `(0, 1, 0)`        |                                                           | <span className="status-badge verified">verified</span> |
| [`zAxis`](#constants) | `Vector3` constant `(0, 0, 1)`        |                                                           | <span className="status-badge verified">verified</span> |
| [`Dot`](#dot)         | `(a, b) → number`                     | scalar dot product                                        | <span className="status-badge verified">verified</span> |
| [`Cross`](#cross)     | `(a, b) → Vector3`                    | right-handed cross product                                | <span className="status-badge verified">verified</span> |
| [`Lerp`](#lerp)       | `(a, b, t) → Vector3`                 | component-wise linear interpolation                       | <span className="status-badge verified">verified</span> |
| [`Floor`](#floor)     | `(v) → Vector3`                       | component-wise `math.floor`                               | <span className="status-badge verified">verified</span> |
| [`Ceil`](#ceil)       | `(v) → Vector3`                       | component-wise `math.ceil`                                | <span className="status-badge verified">verified</span> |
| [`Abs`](#abs)         | `(v) → Vector3`                       | component-wise `math.abs`                                 | <span className="status-badge verified">verified</span> |
| [`Sign`](#sign)       | `(v) → Vector3`                       | component-wise sign (-1, 0, +1)                           | <span className="status-badge verified">verified</span> |
| [`Min`](#min-max)     | `(a, b) → Vector3`                    | component-wise minimum                                    | <span className="status-badge verified">verified</span> |
| [`Max`](#min-max)     | `(a, b) → Vector3`                    | component-wise maximum                                    | <span className="status-badge verified">verified</span> |
| [`Angle`](#angle)     | `(a, b) → number`                     | unsigned angle between vectors (radians)                  | <span className="status-badge verified">verified</span> |
| [`FuzzyEq`](#fuzzyeq) | `(a, b [, eps]) → bool`               | epsilon-tolerant value equality                           | <span className="status-badge verified">verified</span> |

### Instance `v.*` and `v:*`

| Member | Type | Notes |
|---|---|---|
| `v.X`, `v.Y`, `v.Z`            | `number` | the three components |
| `v.Magnitude`                  | `number` | `sqrt(X*X + Y*Y + Z*Z)`, recomputed each access |
| `v.Unit`                       | `Vector3` | the same vector divided by `Magnitude` (zero vector returns NaN-equivalent, do not access on a zero vector) |
| `v:Dot(other)`, `:Cross`, `:Lerp`, `:Floor`, `:Ceil`, `:Abs`, `:Sign`, `:Min`, `:Max`, `:Angle`, `:FuzzyEq` | various | method-call form, equivalent to the static call with `v` as first argument |

---

## `new`

```lua
Vector3.new(x?: number, y?: number, z?: number) → Vector3
```

Constructs a vector. Missing arguments default to `0`. Verified return shapes:

| Call | Result |
|---|---|
| `Vector3.new()`         | `(0, 0, 0)` |
| `Vector3.new(1)`        | `(1, 0, 0)` |
| `Vector3.new(1, 2)`     | `(1, 2, 0)` |
| `Vector3.new(1, 2, 3)`  | `(1, 2, 3)` |
| `Vector3.new(1, 2, 3, 4)` | `(1, 2, 3)` (extra args silently ignored) |
| `Vector3.new(nil)`      | `(0, 0, 0)` (nil treated as 0) |
| `Vector3.new("s")`      | error: `"bad argument #1 to '?' (number expected, got string)"` |

```lua
local up    = Vector3.new(0, 1, 0)
local point = Vector3.new(120.5, 30, -88.2)
print(point.X, point.Y, point.Z, point.Magnitude)
```

---

## Constants

```lua
Vector3.zero   → (0, 0, 0)
Vector3.one    → (1, 1, 1)
Vector3.xAxis  → (1, 0, 0)
Vector3.yAxis  → (0, 1, 0)
Vector3.zAxis  → (0, 0, 1)
```

These are pre-allocated immutable userdata. Use them instead of constructing fresh `Vector3.new(0, 0, 0)` on hot paths.

```lua
local pos = entity.GetLocalPlayer().Position
if pos == Vector3.zero then

end
```

:::warning `==` is identity-only
The metatable does **not** implement value equality. `Vector3.new(1, 2, 3) == Vector3.new(1, 2, 3)` returns `false`. Use [`:FuzzyEq`](#fuzzyeq) for value comparison.
:::

---

## Operators

| Op | Behavior | Verified |
|---|---|---|
| `a + b`   | component-wise add        | `(1,2,3) + (4,5,6) = (5,7,9)` |
| `a - b`   | component-wise sub        | `(1,2,3) - (4,5,6) = (-3,-3,-3)` |
| `a * k`   | scalar multiply           | `(1,2,3) * 2 = (2,4,6)` |
| `k * a`   | scalar multiply (right)   | `2 * (1,2,3) = (2,4,6)` |
| `a / k`   | scalar divide             | `(1,2,3) / 2 = (0.5, 1, 1.5)` |
| `-a`      | unary negate              | `-(1,2,3) = (-1,-2,-3)` |
| `tostring(a)` | `"%.6f, %.6f, %.6f"`  | `(1,2,3) → "1.000000, 2.000000, 3.000000"` |

:::warning `Vector3 * Vector3` silently returns zero
`Vector3.new(1,2,3) * Vector3.new(4,5,6)` returns `(0, 0, 0)`, not the component-wise product `(4, 10, 18)`. The metatable's `__mul` does not support vector-times-vector. Use `Vector3.Dot(a, b)` for scalar product or implement component multiplication manually:
```lua
local function v_mul(a, b) return Vector3.new(a.X*b.X, a.Y*b.Y, a.Z*b.Z) end
```
:::

---

## `Dot`

```lua
Vector3.Dot(a: Vector3, b: Vector3) → number
a:Dot(b)                              → number
```

Standard dot product `a.X*b.X + a.Y*b.Y + a.Z*b.Z`. Verified: `Vector3.new(1,2,3):Dot(Vector3.new(4,5,6))` returns `32`.

```lua
local fwd  = (target_pos - my_pos).Unit
local face = camera_lookvec
local dot  = fwd:Dot(face)
if dot > 0.95 then
```

---

## `Cross`

```lua
Vector3.Cross(a: Vector3, b: Vector3) → Vector3
a:Cross(b)                             → Vector3
```

Right-handed cross product. Verified: `Vector3.new(1,2,3):Cross(Vector3.new(4,5,6))` returns `(-3, 6, -3)`.

```lua
local right = up:Cross(forward)
```

---

## `Lerp`

```lua
Vector3.Lerp(a: Vector3, b: Vector3, t: number) → Vector3
a:Lerp(b, t)                                     → Vector3
```

Linear interpolation `a + (b - a) * t`. `t = 0` returns `a`, `t = 1` returns `b`, no clamping for values outside `[0, 1]`.

Verified: `Vector3.new(1,2,3):Lerp(Vector3.new(4,5,6), 0.5)` returns `(2.5, 3.5, 4.5)`.

```lua
local mid = start_pos:Lerp(end_pos, 0.5)
```

---

## `Floor`

```lua
Vector3.Floor(v: Vector3) → Vector3
v:Floor()                  → Vector3
```

Component-wise `math.floor`. Verified: `Vector3.new(-1.7, 2.3, -3.9):Floor()` returns `(-2, 2, -4)`.

---

## `Ceil`

```lua
Vector3.Ceil(v: Vector3) → Vector3
v:Ceil()                  → Vector3
```

Component-wise `math.ceil`. Verified: `Vector3.new(-1.7, 2.3, -3.9):Ceil()` returns `(-1, 3, -3)`.

---

## `Abs`

```lua
Vector3.Abs(v: Vector3) → Vector3
v:Abs()                  → Vector3
```

Component-wise `math.abs`. Verified: `Vector3.new(-1.7, 2.3, -3.9):Abs()` returns `(1.7, 2.3, 3.9)`.

---

## `Sign`

```lua
Vector3.Sign(v: Vector3) → Vector3
v:Sign()                  → Vector3
```

Component-wise sign function: returns `-1`, `0`, or `+1` for each axis. Verified: `Vector3.new(-1.7, 0, 3.9):Sign()` returns `(-1, 0, 1)`.

---

## `Min` / `Max`

```lua
Vector3.Min(a: Vector3, b: Vector3) → Vector3
Vector3.Max(a: Vector3, b: Vector3) → Vector3
a:Min(b) / a:Max(b)
```

Component-wise minimum / maximum. Useful for AABB clipping.

```lua
local lo = Vector3.Min(corner1, corner2)
local hi = Vector3.Max(corner1, corner2)
local size = hi - lo
```

---

## `Angle`

```lua
Vector3.Angle(a: Vector3, b: Vector3) → number
a:Angle(b)                             → number
```

Returns the unsigned angle in **radians** between two vectors. Verified: `Vector3.xAxis:Angle(Vector3.yAxis)` returns `1.5707963705063` (= π/2).

```lua
local angle_deg = math.deg(my_dir:Angle(target_dir))
```

---

## `FuzzyEq`

```lua
Vector3.FuzzyEq(a: Vector3, b: Vector3 [, eps: number]) → bool
a:FuzzyEq(b)
```

Epsilon-tolerant value equality. Use this instead of `==`, which is identity-only. Verified: `a:FuzzyEq(a)` returns `true`.

```lua
if v:FuzzyEq(Vector3.zero) then

end
```

---

## Patterns

### Distance between two world points
```lua
local function dist(a, b) return (a - b).Magnitude end

local me = entity.GetLocalPlayer():GetBonePosition("HumanoidRootPart")
for _, p in ipairs(entity.GetPlayers(true)) do
    local their = p:GetBonePosition("HumanoidRootPart")
    print(p.Name, dist(me, their))
end
```

### Aim-direction angle to target
```lua
local function angle_to(target_pos)
    local cam     = game.CameraPosition
    local fwd     = (game.GetService("Workspace").CurrentCamera and
                     game.GetService("Workspace").CurrentCamera.CFrame.LookVector)
                    or Vector3.zAxis
    local to_tgt  = (target_pos - cam).Unit
    return fwd:Angle(to_tgt)
end
```

### Snap a position onto a 1-stud grid
```lua
local function snap(v) return v:Floor() end
```

### Component-wise multiply (operator does not work)
```lua
local function v_scale(a, s) return Vector3.new(a.X*s.X, a.Y*s.Y, a.Z*s.Z) end
```

### Test "did the player move this frame"
```lua
local last_pos = Vector3.zero
cheat.register("onUpdate", function()
    local pos = entity.GetLocalPlayer():GetBonePosition("HumanoidRootPart")
    if not pos:FuzzyEq(last_pos) then

    end
    last_pos = pos
end)
```


<!-- ===== userdata/Color3.md ===== -->

---
sidebar_position: 2
title: Color3
---

# `Color3`

RGB color value. Used by every drawing call (`draw.Rect`, `draw.Text`, `draw.Line`, etc.) and as Roblox `BasePart.Color`.

| | |
|---|---|
| **Static factories** | 4 (`new`, `fromRGB`, `fromHSV`, `fromHex`) |
| **Instance fields** | `R`, `G`, `B` (all `number`, range `0..1`) |
| **Instance methods** | 3 (`ToHex`, `ToHSV`, `Lerp`) |
| **Operators** | none (no arithmetic, no `==` value-equality) |

> **Aliases.** `fromRGB`, `fromHSV`, `fromHex`, `ToHSV`, `ToHex` each have **three** forms (PascalCase, camelCase, super-snake): `Color3.fromRGB` / `Color3.from_r_g_b` / `Color3.FromRGB`. `Lerp` has **two** (PascalCase + lowercase). `new` has **one**. See [Overview / Naming convention](../overview#naming-convention).

> **Channel range.** Internally `R`, `G`, `B` are stored as `0..1` floats (Roblox standard). The `tostring` form prints them as `0..255` bytes, see the [tostring note](#tostring) below.

## Quick reference

### Static `Color3.*`

| Name | Signature | Notes | Status |
|---|---|---|---|
| [`new`](#new)         | `(r: number, g: number, b: number) → Color3` | components in `0..1` (Roblox standard)            | <span className="status-badge verified">verified</span> |
| [`fromRGB`](#fromrgb) | `(r: number, g: number, b: number) → Color3` | components in `0..255`, silently clamped          | <span className="status-badge verified">verified</span> |
| [`fromHex`](#fromhex) | `(hex: string) → Color3`                      | exactly 6 hex chars, optional leading `#`         | <span className="status-badge verified">verified</span> |
| [`fromHSV`](#fromhsv) | `(h: number, s: number, v: number) → Color3` | hue / saturation / value, all in `0..1`           | <span className="status-badge verified">verified</span> |

### Instance `c.*` and `c:*`

| Member | Type | Notes |
|---|---|---|
| `c.R`, `c.G`, `c.B`        | `number` (range `0..1`)         | Roblox-standard normalized channels |
| [`c:ToHex()`](#tohex)      | `string`                        | `#RRGGBB` uppercase with leading `#` |
| [`c:ToHSV()`](#tohsv)      | 3 numbers (multi-return)        | `h, s, v` each in `0..1` |
| [`c:Lerp(other, t)`](#lerp) | `Color3`                       | component-wise linear interpolation |

---

## `new`

```lua
Color3.new(r: number, g: number, b: number) → Color3
```

Constructs a color from three `0..1` floats. This is the standard Roblox constructor.

Verified: `Color3.new(0.5, 0.25, 0.1)` returns a color with `.R = 0.5`, `.G = 0.25`, `.B ≈ 0.1`.

```lua
local soft_orange = Color3.new(0.9, 0.5, 0.1)
```

---

## `fromRGB`

```lua
Color3.fromRGB(r: number, g: number, b: number) → Color3
```

Constructs a color from three `0..255` integers. Internally divides by `255` to produce `0..1` floats.

| Call | Result `(R, G, B)` |
|---|---|
| `fromRGB(255, 128, 0)`     | `(1.0, 0.502, 0.0)` |
| `fromRGB(255, 0, 0)`       | `(1.0, 0.0, 0.0)` |
| `fromRGB(0, 0, 0)`         | `(0.0, 0.0, 0.0)` |
| `fromRGB(256, 256, 256)`   | `(1.0, 1.0, 1.0)` (clamped to `255`) |
| `fromRGB(-1, -1, -1)`      | `(0.0, 0.0, 0.0)` (clamped to `0`) |

Verified: out-of-range arguments are silently clamped. No error is raised.

```lua
local red    = Color3.fromRGB(255, 0, 0)
local cyan   = Color3.fromRGB(0, 255, 255)
draw.Rect(10, 10, 100, 100, red, 0, 0, 1)
```

---

## `fromHex`

```lua
Color3.fromHex(hex: string) → Color3
```

Parses a 6-character hex color string. The leading `#` is optional, casing does not matter.

Verified inputs:

| Call | Result |
|---|---|
| `fromHex("#FF8000")` | `(1.0, 0.502, 0.0)` (orange) |
| `fromHex("FF8000")`  | same |
| `fromHex("ff8000")`  | same |
| `fromHex("#fff")`    | error: `"Invalid hex code, must be 6 characters long"` |
| `fromHex("#FFFFFFFF")` | error: `"Invalid hex code, must be 6 characters long"` |
| `fromHex("garbage")` | same error |
| `fromHex("")`        | same error |

:::warning Short hex (`#fff`) is NOT supported
Unlike CSS, the 3-character short form raises an error. Always pass the full 6-character form.
:::

```lua
local accent = Color3.fromHex("#5BC0EB")
local warn   = Color3.fromHex("FFB400")
```

---

## `fromHSV`

```lua
Color3.fromHSV(h: number, s: number, v: number) → Color3
```

Constructs a color from hue / saturation / value, each in `0..1`. Verified: `Color3.fromHSV(0, 1, 1)` returns pure red `(R=1, G=0, B=0)`.

```lua

cheat.register("onPaint", function()
    local hue = (utility.GetTickCount() % 1000) / 1000
    local color = Color3.fromHSV(hue, 1, 1)
    draw.Text("rainbow", 10, 10, color, 12, 1)
end)
```

---

## `ToHex`

```lua
c:ToHex() → string
```

Returns `#RRGGBB` uppercase with a leading `#`. Verified: `Color3.fromRGB(255, 0, 0):ToHex()` returns `"#FF0000"`.

```lua
print(Color3.fromRGB(91, 192, 235):ToHex())
```

---

## `ToHSV`

```lua
c:ToHSV() → h: number, s: number, v: number
```

Returns three numbers (multi-return), each in `0..1`. Inverse of `fromHSV`.

Verified: `Color3.fromHSV(0, 1, 1):ToHSV()` returns `(0, 1, 1)`.

```lua
local h, s, v = my_color:ToHSV()
local rotated = Color3.fromHSV((h + 0.5) % 1, s, v)
```

---

## `Lerp`

```lua
c:Lerp(other: Color3, t: number) → Color3
```

Component-wise linear interpolation between two colors. `t = 0` returns `c`, `t = 1` returns `other`, values outside `[0, 1]` are not clamped.

Verified: `Color3.fromRGB(255,0,0):Lerp(Color3.fromRGB(0,0,255), 0.5)` returns `(R=0.5, G=0, B=0.5)` (a 50/50 red-blue mix, purple).

```lua
local function pulse(t)
    return Color3.fromRGB(255, 50, 50):Lerp(Color3.fromRGB(50, 255, 50), t)
end
```

---

## `tostring`

`tostring(color)` formats the color as **`"r, g, b"` with the channels mapped to `0..255` bytes**, despite the internal storage being `0..1` floats.

| Color | `tostring` |
|---|---|
| `Color3.new(0.5, 0.25, 0.1)`    | `"128, 64, 26"` |
| `Color3.fromRGB(255, 128, 0)`   | `"255, 128, 0"` |
| `Color3.fromRGB(0, 0, 0)`       | `"0, 0, 0"` |
| `Color3.fromHex("#FF0000")`     | `"255, 0, 0"` |

This is **not** the format Roblox itself uses (`"R, G, B"` as `0..1` floats). Treat `tostring(color)` as a debug aid only, do not parse it.

:::info Compare to `entity.GetLocalPlayer().TeamColor`
The cheat's player `TeamColor` userdata uses a different scheme: `tostring` prints `0..65535` 16-bit channels, while its `.R/.G/.B` accessors return `0..255` byte values. **Color3 is different**: `tostring` prints `0..255` bytes, but `.R/.G/.B` return `0..1` floats.
:::

---

## No arithmetic, no value equality

Unlike `Vector3`, `Color3` has **no arithmetic metamethods**. Verified: every operator below raises a Lua-level error.

| Op | Result |
|---|---|
| `red + blue` | error: `"attempt to perform arithmetic on ... (a userdata value)"` |
| `red * 2`    | same error |
| `-red`       | same error |
| `red == red2` | identity-only, returns `false` for two value-equal but distinct colors |

To combine colors, use [`:Lerp`](#lerp) or compute manually:

```lua
local function add_colors(a, b)
    return Color3.new(
        math.min(1, a.R + b.R),
        math.min(1, a.G + b.G),
        math.min(1, a.B + b.B))
end
```

---

## Patterns

### Build a status palette
```lua
local UI = {
    fg     = Color3.fromRGB(230, 230, 230),
    accent = Color3.fromHex("#5BC0EB"),
    ok     = Color3.fromRGB( 90, 220, 120),
    warn   = Color3.fromRGB(240, 180,  80),
    err    = Color3.fromRGB(240,  90,  90),
    bg     = Color3.new(0.05, 0.06, 0.07),
}
```

### Health-driven color
```lua
local function hp_color(hp_ratio)
    local low  = Color3.fromRGB(220,  60,  60)
    local high = Color3.fromRGB( 60, 220,  90)
    return low:Lerp(high, math.max(0, math.min(1, hp_ratio)))
end
```

### Convert a player's TeamColor to Color3
```lua

local function team_to_color3(player)
    local tc = player.TeamColor
    return Color3.fromRGB(tc.R, tc.G, tc.B)
end
```

### Hue-rotate a color
```lua
local function rotate_hue(c, delta)
    local h, s, v = c:ToHSV()
    return Color3.fromHSV((h + delta) % 1, s, v)
end
```


<!-- ===== tools/mcp-bridge.md ===== -->

# MCP Bridge for Serotonin

Drive Serotonin from any MCP-capable agent (Codex, Cursor, Cline, VSCode) without writing Lua by hand.

| | |
|---|---|
| **Repository** | [`mcp-serotonin`](https://github.com/DeftSolutions-dev/mcp-serotonin) (drop-in: `bridge.lua` + `server.py`) |
| **Protocol** | MCP over stdio between client and Python; HTTP between Python and the in-cheat Lua bridge |
| **Coverage** | 30 wrapped tool calls covering exploration (instances, players, parts, bones, screen) and the full `utility` / `memory` / `file` / `audio` / `ui` API discovered in this documentation |
| **Crash protection** | Pre-flight blacklist on the Python side, class-based property allowlist on the Lua side, post-mortem `/crash_report` endpoint |

## Architecture

```
┌──────────────┐  stdio   ┌──────────┐  HTTP :8765  ┌────────────┐  cheat   ┌────────┐
│  MCP client  │ <─────>  │ server.py│ <──────────> │ bridge.lua │ <─────>  │ Roblox │
└──────────────┘          └──────────┘              └────────────┘          └────────┘
   (Codex /                 (Python                    (in-cheat               (game
    Cursor /                 coordinator,              long-poll Lua            DataModel,
    Cline /                  pre-flight                that runs ops)           memory,
    custom)                  blacklist)                                         entity, ui)
```

`bridge.lua` runs **inside** Serotonin (Scripting tab → Load) and long-polls the Python coordinator. When a tool call arrives, the Lua side executes it, serializes the result, and posts it back. An asyncio semaphore + one-at-a-time polling means parallel MCP calls cannot stack parallel evals inside Serotonin (parallel `eval` crashes the cheat reliably).

## Why an MCP layer?

Hand-writing Lua to inspect a Roblox game gets old fast, guessing instance names, hoping `entity.GetPlayers` works in the current mode, hex-formatting addresses. With the bridge loaded, an MCP-capable agent can:

- Walk `Workspace`, list live players with positions
- Find the nearest target of any class within a radius
- Read memory, project world coordinates to screen
- Drive the cheat menu (read / write any UI widget value)
- Stream HTTP / WebSocket data
- Probe new APIs interactively without a full reload

The agent reads the **actual game state** and writes Lua that works in **that specific build / mode**, instead of generic templates.

## Tool catalogue

### Instance / world exploration
| Tool | Description |
|---|---|
| `serotonin_ping` | Liveness check |
| `serotonin_eval` | Run arbitrary Lua. Instances / Vector3 / Color3 auto-serialized. Blocked patterns never reach the cheat in safe mode. |
| `serotonin_inspect` | Properties + Attributes + Children for one Instance |
| `serotonin_search_instances` | Walk `:GetDescendants()` with Name substring + optional ClassName filter |
| `serotonin_tree` | Recursive Name/ClassName dump up to N levels |
| `serotonin_find_by_class` | All descendants of a specific ClassName |
| `serotonin_find_player_model` | Find a player Model by Name |
| `serotonin_nearest` | Nearest instance of a class within a radius |
| `serotonin_descendants_stats` | ClassName histogram for a subtree |
| `serotonin_get_scripts` | All `Script` / `LocalScript` / `ModuleScript` paths |

### Entity / parts / players
| Tool | Description |
|---|---|
| `serotonin_list_players` | `entity.GetPlayers()` + cached fields |
| `serotonin_players_full` | Entity fields + live HumanoidRootPart + screen projection |
| `serotonin_list_parts` | `entity.GetParts()` with optional radius filter |
| `serotonin_parts_count` | `entity.GetPartsCount()` |
| `serotonin_part_details` | Full per-part dump for one index, including 8 OBB corners |
| `serotonin_get_bones` | Position / Size / Rotation for named bones of a player |

### Screen / projection
| Tool | Description |
|---|---|
| `serotonin_project_to_screen` | `utility.WorldToScreen(Vector3)` |
| `serotonin_screen_info` | Window size, camera, mouse, delta time, menu state |

### Memory
| Tool | Description |
|---|---|
| `serotonin_memory_read` | `memory.Read(type, addr)` |
| `serotonin_memory_write` | `memory.Write(type, addr, value)` |
| `serotonin_memory_base` | `memory.GetBase()` |
| `serotonin_memory_scan` | `memory.Scan(pattern, [module])` (added) |
| `serotonin_memory_is_valid` | `memory.IsValid(addr)` (added) |

### File sandbox
| Tool | Description |
|---|---|
| `serotonin_file_read` | `file.read(path)` |
| `serotonin_file_write` | `file.write(path, content)` or `file.append` (boolean flag) |
| `serotonin_file_listdir` | `file.listdir(path)` returning `{name, isDirectory, isFile, size?}` records |
| `serotonin_file_op` | One-shot `exists` / `isdir` / `mkdir` (recursive) / `delete` |

### Audio (safe)
| Tool | Description |
|---|---|
| `serotonin_audio_beep` | `audio.Beep(freq, ms)`. Synchronous, blocks for `ms`. |
| `serotonin_audio_stop_all` | `audio.StopAll()` |

`audio.PlaySound` is intentionally **not** wrapped because non-WAV input crashes the cheat with a native SEH exception, see [audio.PlaySound](../libraries/audio#playsound).

### UI (drive the cheat menu)
| Tool | Description |
|---|---|
| `serotonin_ui_get_value` | `ui.GetValue(tab, container, label)` |
| `serotonin_ui_set_value` | `ui.SetValue(tab, container, label, value)` (value type must match the widget kind, see [`ui`](../libraries/ui)) |

## Crash protection

Some Lua expressions in Serotonin trigger **native C++ exceptions** that `pcall` cannot catch, and they kill the cheat DLL. Confirmed crashers in the current build:

- Reading `_G`, `game.DataModel`, `game.PlaceID`, `game.LocalPlayer.Backpack` and a couple dozen other undocumented `LocalPlayer` fields
- Calling `Color3:ToHSV()` on certain instances (see [Crash triggers](../crash-triggers))
- `audio.PlaySound("")`, and **any** non-WAV string passed to `audio.PlaySound` (added in this audit)
- `cheat.LoadString(...)`, every 2-arg invocation we tried in build `version-390ba09e7e944154` raised `"C++ exception"` (added in this audit)
- `game.GetFFlag` / `game.SetFFlag` (legacy flag, conservatively blacklisted)

The bridge ships with three protections layered on top of each other:

1. **Pre-flight blacklist** (`crash_blacklist.json`) on the Python side. Every op is regex-matched before it leaves the coordinator. Blocked ops never reach the cheat.
2. **Class-based property allowlist** in `bridge.lua`. Only documented properties are read via `safe_inspect` / `dive`. Undocumented Roblox fields are a known crash vector, Serotonin's proxy tries to resolve them via raw memory and faults on unknown offsets.
3. **`/crash_report` endpoint**. After a cheat crash, POST the last operation that ran to the endpoint and the bridge auto-extracts a blacklist rule for the shape. Learn once, never repeat.

Updated `crash_blacklist.json` excerpt (this audit's additions are at the end of `eval_code_blocked`):

```json
{
  "version": 2,
  "eval_code_blocked": [
    "game\\s*\\.\\s*DataModel",
    "game\\s*\\.\\s*PlaceID",
    "game\\s*\\.\\s*GetFFlag",
    "game\\s*\\.\\s*SetFFlag",
    "\\b_G\\b",
    "LocalPlayer\\s*\\.\\s*(Backpack|PlayerGui|PlayerScripts|...)",
    ":ToHSV\\s*\\(",
    "audio\\s*\\.\\s*PlaySound\\s*\\(\\s*[\"'][^\"']{0,10}[\"']",
    "audio\\.PlaySound\\s*\\(\\s*nil",
    "cheat\\s*\\.\\s*[Ll]oadString\\s*\\("
  ]
}
```

## Setup

### Requirements
- Windows 10 / 11 + Serotonin
- Python 3.10 +
- `mcp` and `aiohttp` (in `requirements.txt`)

### Install

```bash
git clone https://github.com/DeftSolutions-dev/mcp-serotonin.git
cd mcp-serotonin
pip install -r requirements.txt
```

Drop `bridge.lua` into your Serotonin scripts folder (`C:\Serotonin\scripts\bridge.lua`).

### Wire to your MCP client

The server speaks stdio. Most MCP clients read a JSON config that looks like:

```json title=".mcp.json"
{
  "mcpServers": {
    "serotonin-bridge": {
      "command": "python",
      "args": ["C:/path/to/mcp-serotonin/server.py"],
      "env": { "PYTHONUNBUFFERED": "1" }
    }
  }
}
```

Save the file where your client looks for it (`.mcp.json` in the project, user-level config, IDE settings).

### Run

1. Launch Roblox + Serotonin.
2. In the Scripting tab, **Load** `bridge.lua`. You should see:
   ```
   [serotonin-bridge v2] loaded, polling http://127.0.0.1:8765
   [serotonin-bridge v2] ops: ping eval inspect safe_inspect snapshot dive live_dump class_counts list_scripts search
   ```
3. Start your MCP client. It spawns `server.py` on demand.
4. Call `serotonin_ping`. You should get back `"pong"`.

If you get a timeout, check that `bridge.lua` is loaded and that `127.0.0.1:8765` is reachable.

## HTTP control endpoints

On top of the MCP tools, `server.py` exposes a few HTTP routes for direct `curl` access:

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/exec` | Run one op (`{op, args, timeout}`) with pre-flight check |
| `POST` | `/cancel` | Drop every queued command. Use after a crash. |
| `GET` / `POST` | `/safe_mode` | Get or toggle (`{enabled: true/false}`) |
| `GET` | `/blacklist` | Full blacklist dump |
| `POST` | `/blacklist` | Patch (`{add, remove}`) |
| `POST` | `/blacklist/reload` | Re-read `crash_blacklist.json` from disk |
| `POST` | `/crash_report` | Report a crash, auto-extract a rule |
| `GET` | `/health` | Queue depth |

```bash
# Toggle safe mode off (dangerous)
curl -X POST http://127.0.0.1:8765/safe_mode -d '{"enabled": false}'

# Dump current blacklist
curl http://127.0.0.1:8765/blacklist | jq

# Cancel everything queued (after a crash)
curl -X POST http://127.0.0.1:8765/cancel
```

## Tool registration pattern (extending the bridge)

Adding a new tool wrapper is two changes in `server.py`:

```python title="server.py"
# 1. Register the tool surface
TOOLS = [
    # ... existing tools ...
    types.Tool(
        name="serotonin_my_new_tool",
        description="One-line description shown to the agent.",
        inputSchema={
            "type": "object",
            "properties": { "x": {"type": "integer"} },
            "required": ["x"],
        },
    ),
]

# 2. Dispatch by name in _dispatch()
async def _dispatch(name: str, a: dict):
    # ... existing branches ...

    if name == "serotonin_my_new_tool":
        code = f"return some_lua_call({int(a['x'])})"
        return await bridge_call("eval", {"code": code})

    raise RuntimeError(f"unknown tool: {name}")
```

That is the entire pattern. Build your Lua snippet, send it through `bridge_call("eval", ...)`, and the bridge serializes the result back. For known crashers, also add a regex to `crash_blacklist.json` so the agent cannot trip them by accident.

## Things that bite (and how this release handles them)

- **Memory types are exact.** Re-verified live, only these 17 are accepted: `byte`, `short`, `ushort`, `int`, `uint`, `int64`, `uint64`, `float`, `double`, `bool`, `string`, `ptr`, `pointer`, `vector2`, `vector3`, `color3`, `cframe`. Every other variant (`dword`, `qword`, `long`, `longlong`, `int8/16/32`, `uint8/16/32`) raises `"Invalid memory type for read: '<name>'"`. `color3` returns multi-return `r, g, b` (0..255). See [memory.Read](../libraries/memory#read).
- **`game.GetService` uses dot syntax**, not colon. `game.GetService("Players")` works; `game:GetService(...)` errors out because the Lua `game` is a sandbox proxy table, not an Instance userdata.
- **Entity API returns userdata, not indices.** Old docs say `entity.GetPlayers()` returns integers. It returns userdata. Access fields as `p.Name`, call bones as `p:GetBonePosition("HumanoidRootPart")`. See [entity](../libraries/entity).
- **`p.Position` is often stale.** Use `p:GetBonePosition("HumanoidRootPart")` for the live value. `serotonin_players_full` does this for you.
- **`buffer` and `raknet` are not bound** in the current build (`type(buffer) == "nil"`, `type(raknet) == "nil"`). Don't reach for them.
- **`Instance:IsA` compares ClassName equality, not inheritance.** `ws:IsA("Instance")` returns `false`; check `ClassName` directly against a known set of concrete classes when you need a "is this a part" check.
- **Don't parallelize eval.** Two simultaneous evals crash Serotonin. The server enforces serial execution via a semaphore.

## Configuration

Environment variables:
- `SEROTONIN_HTTP_HOST` (default `127.0.0.1`)
- `SEROTONIN_HTTP_PORT` (default `8765`)
- `SEROTONIN_HTTP_ONLY=1`, start only the HTTP coordinator, skip stdio MCP

`bridge.lua` tunables (top of the file, `CFG` table):
- `base_url`, must match the host/port above
- `poll_interval_ms`, minimum gap between polls (default `100`)
- `inflight_ttl_ms`, watchdog reset if `http.Get` callback never fires (default `12000`)
- `max_depth`, default serialization depth (default `3`)

Timeouts are synchronized: poll hold (9s) < server default timeout (10s) < bridge inflight TTL (12s). Don't break this ordering or the watchdog will race the client and you'll get phantom resets.

## License

MIT. The full source for both `bridge.lua` and `server.py` lives in the [`mcp-serotonin`](https://github.com/DeftSolutions-dev/mcp-serotonin) repository.


<!-- ===== userdata/Instance.md ===== -->

---
sidebar_position: 1
title: Instance
---

# `Instance`

Methods and properties on Roblox `Instance` userdata returned by [`game.Workspace`](../libraries/game), [`:FindFirstChild`](#findfirstchild), and the rest of the tree-walk accessors. The `Instance` userdata is the cheat's bridge to the live Roblox DataModel: every property read crosses into the game's address space, and every method call is routed through Serotonin's safe-accessor layer.

| | |
|---|---|
| **Methods** | 18 |
| **Properties (verified)** | 38 (varies by underlying Roblox class) |
| **Verified live** | All 18 methods present, behavior verified on `game.Workspace` and `Camera` |
| **Required event context** | none |
| **Side effects** | `SetAttribute`, `SetHighlightOnTop`, `SetHighlightTransparency`, `Destroy` mutate state |

> **Naming.** All methods use PascalCase to mirror the Roblox API. Properties are case-sensitive and only the listed names are bound - accessing `instance.position` (lowercase) returns `nil`, not the value of `Position`.

> **Polymorphic property table.** Different Roblox classes expose different properties. `Camera` has `FieldOfView`/`Fov`/`LookVector`; `Part` has `Position`/`Size`/`Color`; `StringValue` has `Value`. Reading a property that does not exist on the underlying class returns `nil` without raising.

## Quick reference

### Tree walk

| Method | Signature | Returns | Status |
|---|---|---|---|
| [`GetChildren`](#getchildren) | `instance:GetChildren()` | `table` of direct children | <span className="status-badge verified">verified</span> |
| [`GetDescendants`](#getdescendants) | `instance:GetDescendants()` | `table` of all descendants | <span className="status-badge verified">verified</span> |
| [`FindFirstChild`](#findfirstchild) | `instance:FindFirstChild(name)` | `Instance` or nothing | <span className="status-badge verified">verified</span> |
| [`FindFirstChildOfClass`](#findfirstchildofclass) | `instance:FindFirstChildOfClass(className)` | `Instance` or nothing | <span className="status-badge verified">verified</span> |
| [`FindFirstAncestor`](#findfirstancestor) | `instance:FindFirstAncestor(name)` | `Instance` or nothing | <span className="status-badge verified">verified</span> |
| [`FindFirstAncestorOfClass`](#findfirstancestorofclass) | `instance:FindFirstAncestorOfClass(className)` | `Instance` or nothing | <span className="status-badge verified">verified</span> |
| [`FindFirstDescendant`](#findfirstdescendant) | `instance:FindFirstDescendant(name)` | `Instance` or nothing | <span className="status-badge verified">verified</span> |
| [`FindFirstDescendantOfClass`](#findfirstdescendantofclass) | `instance:FindFirstDescendantOfClass(className)` | `Instance` or nothing | <span className="status-badge verified">verified</span> |

### Type / hierarchy checks

| Method | Signature | Returns | Status |
|---|---|---|---|
| [`IsA`](#isa) | `instance:IsA(className)` | `boolean` (ClassName equality, not inheritance) | <span className="status-badge verified">verified</span> |
| [`IsDescendantOf`](#isdescendantof) | `instance:IsDescendantOf(ancestor)` | `boolean` | <span className="status-badge verified">verified</span> |
| [`IsAncestorOf`](#isancestorof) | `instance:IsAncestorOf(descendant)` | `boolean` | <span className="status-badge verified">verified</span> |

### Attributes

| Method | Signature | Returns | Status |
|---|---|---|---|
| [`GetAttributes`](#getattributes) | `instance:GetAttributes()` | array of `{ Name, Value, TypeName }` | <span className="status-badge verified">verified</span> |
| [`GetAttribute`](#getattribute) | `instance:GetAttribute(name)` | `any` or `nil` | <span className="status-badge verified">verified</span> |
| [`GetFirstAttributeOfType`](#getfirstattributeoftype) | `instance:GetFirstAttributeOfType(typeName)` | `any` | <span className="status-badge verified">verified</span> |
| [`SetAttribute`](#setattribute) | `instance:SetAttribute(name, value)` | nothing | <span className="status-badge verified">verified</span> |

### Visual / lifecycle

| Method | Signature | Returns | Status |
|---|---|---|---|
| [`SetHighlightOnTop`](#sethighlightontop) | `instance:SetHighlightOnTop()` | nothing | <span className="status-badge verified">verified</span> |
| [`SetHighlightTransparency`](#sethighlighttransparency) | `instance:SetHighlightTransparency(value)` | nothing | <span className="status-badge verified">verified</span> |
| [`Destroy`](#destroy) | `instance:Destroy()` | nothing | <span className="status-badge verified">verified</span> |

---

## `GetChildren`

```lua
instance:GetChildren() -> table
```

Returns an array of the instance's direct children. Empty table when the instance has none. The order matches Roblox's internal child order (which is generally insertion order).

Verified live on `game.Workspace`: returned a 1082-entry table on a populated Roblox place. Each entry is a fresh `Instance` userdata.

```lua
for _, child in ipairs(game.Workspace:GetChildren()) do
    print(child.Name, child.ClassName)
end
```

---

## `GetDescendants`

```lua
instance:GetDescendants() -> table
```

Returns a flat array of every descendant in the subtree (children, grandchildren, ...). Order is depth-first. Use this when you need to enumerate everything in the subtree at once. For a single-target lookup, [`FindFirstDescendant`](#findfirstdescendant) is cheaper and **does** walk the full subtree (verified live: `ws:FindFirstDescendant("Camera")` returns the Camera even though it is a direct child).

:::warning Cost
On a populated Workspace `GetDescendants` returns tens of thousands of entries. Cache the result instead of calling it every frame.
:::

```lua
local cache = {}
cheat.Register("onUpdate", function()
    if #cache == 0 then
        cache = game.Workspace:GetDescendants()
    end
end)
```

---

## `FindFirstChild`

```lua
instance:FindFirstChild(name: string) -> Instance
```

Returns the first **direct** child whose `Name` matches `name`. Searches one level only.

Verified arg shape:

| Call | Result |
|---|---|
| `ws:FindFirstChild("Camera")` | `Instance` userdata |
| `ws:FindFirstChild("zzz_not_real")` | nothing (no return value, `nil` in expressions) |
| `ws:FindFirstChild(nil)` | error: `bad argument #1 (string expected, got nil)` |

```lua
local map = game.Workspace:FindFirstChild("Map")
if map then
    print("found map with", #map:GetChildren(), "children")
end
```

---

## `FindFirstChildOfClass`

```lua
instance:FindFirstChildOfClass(className: string) -> Instance
```

Returns the first direct child whose `ClassName` equals `className`. Like `IsA`, this is **strict ClassName equality** - `FindFirstChildOfClass("BasePart")` will not find a `Part`.

Verified live: `ws:FindFirstChildOfClass("Camera")` returned the workspace Camera userdata.

```lua
local cam = game.Workspace:FindFirstChildOfClass("Camera")
if cam then print("FOV (rad):", cam.FieldOfView) end
```

---

## `FindFirstAncestor`

```lua
instance:FindFirstAncestor(name: string) -> Instance
```

Walks up the `.Parent` chain and returns the first ancestor whose `Name` matches `name`. Returns nothing if no such ancestor exists.

Useful when you have a deep descendant (a hat, a weapon model accessory) and need its parent character / model:

```lua
local rootpart = part:FindFirstAncestor("HumanoidRootPart")
```

---

## `FindFirstAncestorOfClass`

```lua
instance:FindFirstAncestorOfClass(className: string) -> Instance
```

Walks up the `.Parent` chain and returns the first ancestor whose `ClassName` equals `className`.

```lua
local model = inst:FindFirstAncestorOfClass("Model")
```

---

## `FindFirstDescendant`

```lua
instance:FindFirstDescendant(name: string) -> Instance
```

Returns the first descendant with the given `Name`, walking the **full** subtree recursively (verified live: `ws:FindFirstDescendant("Camera")` returns the Camera, `part:FindFirstDescendant("Foo")` returns nothing when no such descendant exists). The exact traversal order is implementation-defined; treat it as "any descendant matching that name".

:::info When to use `GetDescendants` instead
If your script needs predictable order or has to match additional criteria (Name + ClassName + attribute value), iterate `GetDescendants()` yourself.
:::

---

## `FindFirstDescendantOfClass`

```lua
instance:FindFirstDescendantOfClass(className: string) -> Instance
```

Same as `FindFirstDescendant` but matches by `ClassName`. Strict equality (no inheritance walk - like [`IsA`](#isa)). Verified live: `ws:FindFirstDescendantOfClass("Camera")` returns the workspace Camera.

---

## `IsA`

```lua
instance:IsA(className: string) -> boolean
```

:::danger Not inheritance-aware
This runtime's `IsA` does **not** walk the Roblox class hierarchy. It compares `instance.ClassName` to the argument string with a direct equality check.
:::

Verified live on `game.Workspace`:

| Call | Result |
|---|---|
| `ws:IsA("Workspace")` | `true` |
| `ws:IsA("Instance")` | `false` (Workspace inherits from Instance in real Roblox, but this `IsA` ignores that) |
| `ws:IsA("Part")` | `false` |

If you need to match "any kind of part", check `ClassName` against a known set of concrete classes:

```lua
local PART_CLASSES = {
    Part = true, MeshPart = true, WedgePart = true,
    TrussPart = true, CornerWedgePart = true,
}
for _, child in ipairs(game.Workspace:GetChildren()) do
    if PART_CLASSES[child.ClassName] then
        print("part:", child.Name)
    end
end
```

---

## `IsDescendantOf`

```lua
instance:IsDescendantOf(ancestor: Instance) -> boolean
```

Returns `true` if `instance` appears anywhere in `ancestor`'s subtree.

```lua
local cam = game.Workspace:FindFirstChildOfClass("Camera")
print(cam:IsDescendantOf(game.Workspace))   -- true
```

---

## `IsAncestorOf`

```lua
instance:IsAncestorOf(descendant: Instance) -> boolean
```

Inverse of `IsDescendantOf`. Returns `true` if `descendant` is anywhere in `instance`'s subtree.

---

## `GetAttributes` / `GetAttribute` / `SetAttribute` / `GetFirstAttributeOfType`

```lua
instance:GetAttributes() -> table
instance:GetAttribute(name: string) -> table | nil
instance:GetFirstAttributeOfType(typeName: string) -> table | nil
instance:SetAttribute(name: string, value: any) -> nothing
```

:::info Reads work, writes do not persist
Re-verified live in build `version-390ba09e7e944154`:

- **`GetAttributes()` and `GetAttribute(name)` work** for attributes already populated by the Roblox engine or the place script. Verified: `game.Workspace:GetAttribute("RbxLegacyAnimationBlending")` returns `{Value=true, Name="RbxLegacyAnimationBlending", TypeName="bool"}`.
- **`SetAttribute(name, value)` succeeds without error but does not persist.** Verified across `number`, `string`, `bool`, and `Vector3` value types, with both immediate and one-frame-deferred `GetAttribute` reads — every Set call was silently dropped, every following `GetAttribute` returned `nil`, and `GetAttributes()` continued to return what it returned before.

So this API is effectively **read-only** in this build. Use it to read values set by the place / engine; do not rely on it for cross-script state. For your own state, use `cheat.Register` event-scoped variables, file IO, or the `ui.GetValue` / `ui.SetValue` widget round-trip.
:::

### `GetAttribute(name)` returns a record, not the raw value

Unlike Roblox's standard API where `instance:GetAttribute(name)` returns the value directly, this runtime returns a **3-key record table** with the same shape as one entry of `GetAttributes()`:

```lua
{ Name = string, Value = any, TypeName = string }
```

Verified:

| Call | Result |
|---|---|
| `ws:GetAttribute("RbxLegacyAnimationBlending")` | `{ Name = "RbxLegacyAnimationBlending", Value = true, TypeName = "bool" }` |
| `ws:GetAttribute("InsertPoint")` (not set) | `nil` |
| `ws:GetAttribute("Retargeting")` (not set) | `nil` |
| `ws:GetAttribute("AnimationWeightedBlendFix")` (not set) | `nil` |

Read the value through `.Value`:

```lua
local rec = game.Workspace:GetAttribute("RbxLegacyAnimationBlending")
if rec then
    print("blend mode:", rec.Value, "type:", rec.TypeName)
end
```

### `GetAttributes()` returns an array of records

Iterate with `ipairs`, not `pairs` — the result is an array, not a name-keyed map. Each record has the same shape as the `GetAttribute` return.

Verified live: `game.Workspace:GetAttributes()` returned `{ [1] = { Name = "RbxLegacyAnimationBlending", Value = true, TypeName = "bool" } }`. `TypeName` follows the Roblox attribute taxonomy: `"bool"`, `"string"`, `"number"`, `"Vector3"`, `"Color3"`, `"UDim2"`, `"BrickColor"`, etc.

```lua
for _, attr in ipairs(game.Workspace:GetAttributes()) do
    print(attr.Name, attr.TypeName, attr.Value)
end
```

### `GetFirstAttributeOfType(typeName)`

Returns the first attribute record whose `TypeName` matches the argument, or `nil` when no match. Same record shape as `GetAttribute`.

### `SetAttribute(name, value)` — non-functional in this build

The call accepts `name: string` plus `value` of any of the standard attribute types (`bool`, `number`, `string`, `Vector3`, `Color3`, ...) and returns nothing. **It silently no-ops**: the value is not stored, and the next `GetAttribute(name)` returns `nil`.

| Call | Verified result |
|---|---|
| `part:SetAttribute("Key", 42)`            | succeeds, no error, value is not stored |
| `part:SetAttribute("Key", "abc")`         | succeeds, not stored |
| `part:SetAttribute("Key", true)`          | succeeds, not stored |
| `part:SetAttribute("Key", Vector3.new(1, 2, 3))` | succeeds, not stored |
| `instance:SetAttribute("Foo", nil)`       | error: `"bad argument #3 to '?' (unsupported type for attribute value)"` (cannot clear via `nil`) |

```lua
local part = game.Workspace:FindFirstChild("Part")
if part then
    part:SetAttribute("MyFlag", true)
    print(part:GetAttribute("MyFlag"))
end
```

---

## `SetHighlightOnTop`

```lua
instance:SetHighlightOnTop() -> nothing
```

For instances of class `Highlight`, switches the highlight to render on top of everything (ignoring depth). No-op for other instance classes.

```lua
local hl = Instance.new("Highlight")
hl.Parent = part
hl:SetHighlightOnTop()
```

---

## `SetHighlightTransparency`

```lua
instance:SetHighlightTransparency(value: number) -> nothing
```

Sets the highlight's `FillTransparency`. Value range `0..1` (0 = fully opaque fill, 1 = fully transparent fill).

---

## `Destroy`

```lua
instance:Destroy() -> nothing
```

Destroys the instance (parents to `nil`, locks the object). Standard Roblox semantics.

:::warning Side effect on the live game
This actually removes the instance from the Roblox game tree. Don't call it on `Workspace`, `Players`, or any service - it can crash the client.
:::

---

## Properties

Property reads return `nil` when the underlying class doesn't expose that field. The cheat exposes the union of fields across all common Roblox classes.

| Name | Type | Description |
|---|---|---|
| `Name` | `string` | The name of the instance. Verified `"Workspace"` on `game.Workspace`. |
| `ClassName` | `string` | The class name of the instance. Verified `"Workspace"` on `game.Workspace`. |
| `Parent` | `Instance` | The parent in the hierarchy (`Workspace.Parent` is the DataModel userdata). |
| `Address` | `number` | The low 32 bits of the C++ instance pointer. Verified `488443520` on `game.Workspace` in one run. |
| `Character` | `Instance` | A Player's character model. |
| `Position` | `Vector3` | The 3D position of a Part. |
| `Size` | `Vector3` | The size of a Part. |
| `Velocity` | `Vector3` | The velocity of a Part. |
| `Rotation` | `Vector3` | The rotation of a Part (Euler XYZ in degrees). |
| `Color` | `Color3` | The Color3 value of a Part. |
| `Material` | `string` | The material of a Part. |
| `Transparency` | `number` | The transparency of a Part (0-1). |
| `Reflectance` | `number` | The reflectance of a Part (0-1). |
| `CanCollide` | `boolean` | Whether a Part can be collided with. |
| `Health` | `number` | The current health of a Humanoid. |
| `MaxHealth` | `number` | The maximum health of a Humanoid. |
| `MoveDirection` | `Vector3` | The move direction of a Humanoid. |
| `MeshId` | `string` | The mesh asset ID of a MeshPart. |
| `TextureId` | `string` | The texture asset ID. |
| `SoundId` | `string` | The sound asset ID. |
| `LookVector` | `Vector3` | The look direction of a Camera (CFrame's forward axis). Verified userdata on `Camera`. |
| `RightVector` | `Vector3` | The right direction of a Camera. Verified userdata on `Camera`. |
| `UpVector` | `Vector3` | The up direction of a Camera. Verified userdata on `Camera`. |
| `Fov` / `FieldOfView` | `number` | The field of view of a Camera **in radians**. Verified `1.2217305898666` (= 70°) on `Camera`. Both names are aliases for the same field. |
| `CameraSubject` | `Instance` | The subject of the Camera. |
| `FillColor` | `Color3` | The fill color of a Highlight. |
| `OutlineColor` | `Color3` | The outline color of a Highlight. |
| `FillTransparency` | `number` | The fill transparency of a Highlight. |
| `DepthMode` | `number` | The depth mode of a Highlight. |
| `Value` | `any` | The value of a ValueBase object. |
| `StringValue` | `string` | The value of a StringValue instance. |
| `NumberValue` | `number` | The value of a NumberValue instance. |
| `IntValue` | `number` | The value of an IntValue instance. |
| `BoolValue` | `boolean` | The value of a BoolValue instance. |
| `ObjectValue` | `Instance` | The value of an ObjectValue instance. |
| `TextLabelValue` | `string` | The text content of a TextLabel. |
| `TextColor3` | `Color3` | The text color of a TextLabel. |

:::warning No `CFrame` property
Verified live: `cam.CFrame` returned `nil` on a real Camera. The cheat exposes the CFrame's components (`LookVector`, `RightVector`, `UpVector`, `Position`) but **not** the CFrame itself. To reconstruct orientation use the three direction vectors plus `Position`.
:::

---

## Patterns

### Walk children with class filter
```lua
local PART_CLASSES = {
    Part = true, MeshPart = true, WedgePart = true,
    TrussPart = true, CornerWedgePart = true,
}

local function visible_parts(root)
    local out = {}
    for _, child in ipairs(root:GetChildren()) do
        if PART_CLASSES[child.ClassName] and child.Transparency < 1 then
            out[#out + 1] = child
        end
    end
    return out
end
```

### Read all attributes from a model
```lua
local function dump_attributes(inst)
    print(inst.Name, inst.ClassName)
    for _, a in ipairs(inst:GetAttributes()) do
        print(string.format("  %-24s %-10s %s",
            a.Name, a.TypeName, tostring(a.Value)))
    end
end

dump_attributes(game.Workspace)
```

### Camera info HUD
```lua
cheat.Register("onPaint", function()
    local cam = game.Workspace:FindFirstChildOfClass("Camera")
    if not cam then return end
    local fov_deg = cam.FieldOfView * 57.2957795
    local lv = cam.LookVector
    draw.TextOutlined(string.format("FOV %.1f deg", fov_deg),
        10, 10, Color3.fromRGB(255, 255, 255), "ConsolasBold", 1)
    draw.TextOutlined(string.format("Look %.2f %.2f %.2f", lv.X, lv.Y, lv.Z),
        10, 26, Color3.fromRGB(200, 200, 200), "ConsolasBold", 1)
end)
```

### Find a deep descendant
```lua
-- FindFirstDescendant searches the subtree but order is implementation-defined.
-- For predictable behavior, walk GetDescendants yourself.
local function find_by_name_class(root, name, cls)
    for _, d in ipairs(root:GetDescendants()) do
        if d.Name == name and d.ClassName == cls then return d end
    end
    return nil
end

local hrp = find_by_name_class(game.Workspace, "HumanoidRootPart", "Part")
```

### Highlight all parts in a model
```lua
local function highlight_model(model, fill_alpha)
    for _, d in ipairs(model:GetDescendants()) do
        if d.ClassName == "Part" or d.ClassName == "MeshPart" then
            local hl = Instance.new("Highlight")
            hl.FillColor = Color3.fromRGB(255, 90, 90)
            hl.OutlineColor = Color3.fromRGB(255, 255, 255)
            hl.Parent = d
            hl:SetHighlightOnTop()
            hl:SetHighlightTransparency(fill_alpha or 0.5)
        end
    end
end
```


<!-- ===== userdata/Part.md ===== -->

---
sidebar_position: 2
title: Part
---

# `Part`

Methods callable on entries returned by [`entity.GetParts()`](../libraries/entity#getparts). The `Part` userdata is the cheat's pre-cached projection of a Roblox `BasePart` - it carries the part's world-space pose, color, shape, and a precomputed OBB so you can render ESP without re-traversing the DataModel each frame.

:::danger Not the same as a Roblox `BasePart` Instance
The methods on this page (`GetPartPosition`, `GetPartSize`, etc.) exist **only** on the userdata that `entity.GetParts()` returns. They are **not** present on Roblox `Instance` userdata you obtain by walking `game.Workspace`. Verified live:

```lua
local kid = game.Workspace:FindFirstChild("HumanoidRootPart")
print(type(kid.GetPartPosition))  -- prints: nil
```

If you have a Workspace `BasePart` Instance, read its plain Roblox properties instead (`inst.Position`, `inst.Size`, `inst.Color`, `inst.Transparency`, `inst.MeshId`, `inst.Address`). The `:GetPart*` methods are exclusive to the cheat's part cache.
:::

:::warning `entity.GetParts()` is often empty
Verified live: in pure-UI scenes, Studio test environments, and at least one real Roblox place we tested in, `entity.GetPartsCount()` returned `0`. The cache is populated by the cheat in game-modes where part-level ESP makes sense; in others it stays empty. Always guard with `if parts and parts[1] then ... end` or check `entity.GetPartsCount()` before iterating.
:::

| | |
|---|---|
| **Methods** | 13 |
| **Live invocation** | Requires `entity.GetParts()` to return a non-empty array. All 13 method names exist on the metatable; their live return shapes are documented from the cheat developer's authoritative spec. |
| **Required event context** | none for the methods themselves - the `Part` userdata is only valid for the duration of the cache tick that produced it |
| **Side effects** | none - all 13 methods are read-only |

> **Method-call syntax.** Use `:` not `.`: `parts[1]:GetPartPosition()`. Calling with `.` and forgetting `self` raises `bad argument #1`.

> **Cache lifetime.** A `Part` userdata returned by `entity.GetParts()` is only safe to use during the same frame. The cheat's part cache is rebuilt on a separate thread; cross-frame storage of these userdata values will eventually point at recycled slots. Always pull a fresh array from `GetParts()` per `onPaint` or `onUpdate` callback.

> **Need cube corners on a Workspace Instance?** Use [`draw.GetPartCorners(inst)`](../libraries/draw#getpartcorners) - verified to accept a regular Roblox `BasePart` Instance and return 8 corner userdata. That's the workaround when the cheat's part cache is empty.

## Quick reference

### Pose

| Method | Signature | Returns | Status |
|---|---|---|---|
| [`GetPartPosition`](#getpartposition) | `part:GetPartPosition()` | `Vector3` | <span className="status-badge verified">verified</span> |
| [`GetPartSize`](#getpartsize) | `part:GetPartSize()` | `Vector3` | <span className="status-badge verified">verified</span> |
| [`GetPartRotation`](#getpartrotation) | `part:GetPartRotation()` | `table` (9-element rotation matrix) | <span className="status-badge verified">verified</span> |
| [`GetPartCubeVertices`](#getpartcubevertices) | `part:GetPartCubeVertices()` | `table` (8 OBB corners) | <span className="status-badge verified">verified</span> |

### Identity

| Method | Signature | Returns | Status |
|---|---|---|---|
| [`GetPartInstance`](#getpartinstance) | `part:GetPartInstance()` | `Instance` | <span className="status-badge verified">verified</span> |
| [`GetPartAddress`](#getpartaddress) | `part:GetPartAddress()` | `number` (uint64 raw pointer) | <span className="status-badge verified">verified</span> |
| [`GetPartPrimitive`](#getpartprimitive) | `part:GetPartPrimitive()` | `number` (raw Primitive struct address) | <span className="status-badge verified">verified</span> |
| [`GetPartClassName`](#getpartclassname) | `part:GetPartClassName()` | `string` | <span className="status-badge verified">verified</span> |

### Visual

| Method | Signature | Returns | Status |
|---|---|---|---|
| [`GetPartColor`](#getpartcolor) | `part:GetPartColor()` | `r, g, b` (multi-return, 0..255) | <span className="status-badge verified">verified</span> |
| [`GetPartTransparency`](#getparttransparency) | `part:GetPartTransparency()` | `number` (0..1) | <span className="status-badge verified">verified</span> |
| [`GetPartShape`](#getpartshape) | `part:GetPartShape()` | `string` (`"Ball"` / `"Block"` / `"Cylinder"` / `"Wedge"` / `"CornerWedge"`) | <span className="status-badge verified">verified</span> |

### Mesh

| Method | Signature | Returns | Status |
|---|---|---|---|
| [`GetPartMeshId`](#getpartmeshid) | `part:GetPartMeshId()` | `string` (asset id, `""` if none) | <span className="status-badge verified">verified</span> |
| [`GetPartHasMesh`](#getparthasmesh) | `part:GetPartHasMesh()` | `boolean` | <span className="status-badge verified">verified</span> |

---

## `GetPartPosition`

```lua
part:GetPartPosition() -> Vector3
```

Returns the part's center in world space as a `Vector3` userdata. This is the same value Roblox exposes as `BasePart.Position`, but pulled from the cheat's part cache without crossing into the engine - it is safe to call thousands of times per frame.

```lua
local parts = entity.GetParts()
for i = 1, #parts do
    local pos = parts[i]:GetPartPosition()
    -- screen-project for ESP
    local sx, sy, on = utility.WorldToScreen(pos)
    if on then
        draw.CircleFilled(sx, sy, 2, Color3.fromRGB(255, 255, 0))
    end
end
```

---

## `GetPartSize`

```lua
part:GetPartSize() -> Vector3
```

Returns the part's local-axis size as a `Vector3` (x, y, z each in studs). For non-axis-aligned parts the world-space bounding box is computed by the rotation matrix from `GetPartRotation`.

```lua
local size = parts[1]:GetPartSize()
local volume_studs3 = size.X * size.Y * size.Z
```

---

## `GetPartRotation`

```lua
part:GetPartRotation() -> table
```

Returns the part's 3×3 rotation matrix as a flat 9-element array, **row-major**. Rows are `right`, `up`, `forward` respectively (same convention as `Player:GetBoneRotation`).

| Index | Meaning |
|---|---|
| `[1], [2], [3]` | Right vector (X axis in part-local space) |
| `[4], [5], [6]` | Up vector (Y axis) |
| `[7], [8], [9]` | Forward vector (Z axis) |

```lua
local rot = parts[1]:GetPartRotation()
local right   = Vector3.new(rot[1], rot[2], rot[3])
local up      = Vector3.new(rot[4], rot[5], rot[6])
local forward = Vector3.new(rot[7], rot[8], rot[9])
```

---

## `GetPartCubeVertices`

```lua
part:GetPartCubeVertices() -> table
```

Returns the 8 world-space corners of the part's oriented bounding box as an array of 3-element `{x, y, z}` arrays. Corner ordering is consistent across calls. This is the cheapest way to draw a tight box ESP - no manual rotation math needed.

The box accounts for both `Size` and `Rotation`, so a 45°-rotated part returns its true rotated corners (not an axis-aligned approximation).

```lua
local verts = parts[1]:GetPartCubeVertices()
local screen = {}
for i = 1, 8 do
    local v = verts[i]
    local sx, sy, on = utility.WorldToScreen(Vector3.new(v[1], v[2], v[3]))
    screen[i] = { sx, sy, on }
end
-- pair up adjacent corners and draw 12 edges (4 bottom, 4 top, 4 vertical)
```

---

## `GetPartInstance`

```lua
part:GetPartInstance() -> Instance
```

Returns the underlying Roblox `Instance` userdata for the part. This is the same object you would get by walking the DataModel and finding the `BasePart` - but unlike the cached `Part` userdata, the returned `Instance` exposes the full set of [Instance methods](../userdata/Instance) (`GetChildren`, `GetAttributes`, `IsA`, etc.).

```lua
local inst = parts[1]:GetPartInstance()
print(inst.Name, inst.ClassName)
for _, attr in ipairs(inst:GetAttributes()) do
    print("  attr:", attr.Name, "=", tostring(attr.Value))
end
```

---

## `GetPartAddress`

```lua
part:GetPartAddress() -> number
```

Returns the raw 64-bit virtual address of the underlying `Instance` struct in the Roblox process. Useful when you need to bypass the property-accessor path and read fields directly via [`memory.Read`](../libraries/memory#read).

The number is a Lua double, so addresses above `2^53` lose 1 bit of precision (rare on 64-bit Windows because user-space pointers fit in 47 bits).

```lua
local addr = parts[1]:GetPartAddress()
local class_name_ptr = memory.Read("ptr", addr + 0x18)
```

:::warning Volatile
Two calls in the same frame return the same address. After the next cache tick that address may point at a different (or freed) Instance. Re-fetch with `entity.GetParts()` rather than caching addresses across frames.
:::

---

## `GetPartPrimitive`

```lua
part:GetPartPrimitive() -> number
```

Returns the raw 64-bit address of the part's internal **Primitive** struct (Roblox's name for the physics-and-render data block hanging off a `BasePart`). The Primitive is where `CFrame`, raw mesh data, and a few hidden flags live in memory.

This is an escape hatch for memory-level work; if you only need positions / sizes, prefer the high-level methods above.

```lua
local prim = parts[1]:GetPartPrimitive()
```

---

## `GetPartClassName`

```lua
part:GetPartClassName() -> string
```

Returns the underlying Instance's `ClassName` (e.g. `"Part"`, `"MeshPart"`, `"WedgePart"`, `"TrussPart"`, `"CornerWedgePart"`). Equivalent to reading `:GetPartInstance().ClassName` but cheaper.

```lua
local cls = parts[1]:GetPartClassName()
if cls == "MeshPart" then
    -- only mesh-shaped parts care about the mesh asset id
    print(parts[1]:GetPartMeshId())
end
```

---

## `GetPartColor`

```lua
part:GetPartColor() -> number, number, number
```

Returns the part's color as **three numbers** (multi-return), each in the `0..255` byte range. Use `select("#", ...)` to confirm the multi-return shape.

```lua
local r, g, b = parts[1]:GetPartColor()
local color   = Color3.fromRGB(r, g, b)
```

:::info Not the same shape as `Color3`
`Color3.new(r, g, b)` takes `0..1` floats. `GetPartColor` returns `0..255` integers. Convert via `Color3.fromRGB(r, g, b)`.
:::

---

## `GetPartTransparency`

```lua
part:GetPartTransparency() -> number
```

Returns the part's transparency in the `0..1` range. `0` = fully opaque, `1` = fully invisible. Filter with `t < 1` to skip ghost-parts that the player cannot see.

```lua
if parts[1]:GetPartTransparency() < 1 then
    -- visible, draw it
end
```

---

## `GetPartShape`

```lua
part:GetPartShape() -> string
```

Returns the geometric shape as one of the canonical strings:

| Return | Meaning |
|---|---|
| `"Block"` | Standard cuboid `Part` |
| `"Ball"` | Sphere `Part` |
| `"Cylinder"` | Cylinder `Part` |
| `"Wedge"` | `WedgePart` |
| `"CornerWedge"` | `CornerWedgePart` |

`MeshPart` parts return one of the above as a fallback shape (the rendered geometry is whatever the mesh asset says, but the collision/bounding shape is one of these five).

```lua
local shape = parts[1]:GetPartShape()
if shape == "Ball" then
    local pos    = parts[1]:GetPartPosition()
    local size   = parts[1]:GetPartSize()
    local radius = size.X * 0.5
    local sx, sy, on = utility.WorldToScreen(pos)
    if on then
        draw.Circle(sx, sy, radius, Color3.fromRGB(255, 255, 0), 1)
    end
end
```

---

## `GetPartMeshId`

```lua
part:GetPartMeshId() -> string
```

Returns the mesh asset id for `MeshPart` instances (typically `"rbxassetid://<id>"` or `"rbxasset://...mesh"`). Returns the empty string `""` for non-mesh parts.

```lua
if parts[1]:GetPartHasMesh() then
    local id = parts[1]:GetPartMeshId()
    print("mesh:", id)
end
```

---

## `GetPartHasMesh`

```lua
part:GetPartHasMesh() -> boolean
```

Returns `true` if the cheat has triangle mesh data cached for this part. This is what you check before calling `draw.GetMesh` (when documented) or before reading `GetPartMeshId`.

For plain `Part` / `WedgePart` etc. this is `false` - those use one of the canonical shape primitives, not a triangle mesh.

```lua
local mesh_parts = {}
for i = 1, #parts do
    if parts[i]:GetPartHasMesh() then
        mesh_parts[#mesh_parts + 1] = parts[i]
    end
end
print(#mesh_parts, "mesh parts cached")
```

---

## Patterns

### ESP loop with screen-projected OBB
```lua
local function draw_obb(p)
    local verts = p:GetPartCubeVertices()
    local s = {}
    for i = 1, 8 do
        local v = verts[i]
        local sx, sy, on = utility.WorldToScreen(Vector3.new(v[1], v[2], v[3]))
        s[i] = { sx, sy, on }
    end
    -- 12 edges of a cube: bottom 1-2-3-4-1, top 5-6-7-8-5, verticals 1-5,2-6,3-7,4-8
    local edges = {
        {1,2},{2,3},{3,4},{4,1},
        {5,6},{6,7},{7,8},{8,5},
        {1,5},{2,6},{3,7},{4,8},
    }
    local color = Color3.fromRGB(255, 200, 0)
    for _, e in ipairs(edges) do
        local a, b = s[e[1]], s[e[2]]
        if a[3] and b[3] then
            draw.Line(a[1], a[2], b[1], b[2], color, 1)
        end
    end
end

cheat.Register("paint", function()
    local parts = entity.GetParts()
    for i = 1, #parts do
        if parts[i]:GetPartTransparency() < 1 then
            draw_obb(parts[i])
        end
    end
end)
```

### Color-coded part overlay
```lua
local SHAPE_COLOR = {
    Block       = Color3.fromRGB(120, 180, 255),
    Ball        = Color3.fromRGB(255, 200,  80),
    Cylinder    = Color3.fromRGB( 90, 220, 120),
    Wedge       = Color3.fromRGB(220,  90, 220),
    CornerWedge = Color3.fromRGB(220, 220,  90),
}

cheat.Register("paint", function()
    local parts = entity.GetParts()
    for i = 1, #parts do
        local p = parts[i]
        local col = SHAPE_COLOR[p:GetPartShape()] or Color3.fromRGB(255, 255, 255)
        local pos = p:GetPartPosition()
        local sx, sy, on = utility.WorldToScreen(pos)
        if on then
            draw.RectFilled(sx - 2, sy - 2, 4, 4, col)
        end
    end
end)
```

### Mesh-part filter and dump
```lua
cheat.Register("onSlowUpdate", function()
    local parts = entity.GetParts()
    local meshes = {}
    for i = 1, #parts do
        if parts[i]:GetPartHasMesh() then
            meshes[#meshes + 1] = string.format("%s @ %s -> %s",
                parts[i]:GetPartClassName(),
                tostring(parts[i]:GetPartPosition()),
                parts[i]:GetPartMeshId())
        end
    end
    file.write("mesh_dump.txt", table.concat(meshes, "\n"))
end)
```

### Address dump for memory analysis
```lua
local function dump_addresses(out_path)
    local parts = entity.GetParts()
    local lines = { string.format("# %d parts cached", #parts) }
    for i = 1, math.min(#parts, 200) do
        local addr = parts[i]:GetPartAddress()
        local prim = parts[i]:GetPartPrimitive()
        lines[#lines + 1] = string.format("[%03d] inst=0x%X prim=0x%X class=%s",
            i, addr, prim, parts[i]:GetPartClassName())
    end
    file.write(out_path, table.concat(lines, "\n"))
end

ui.NewButton("Tools", "Memory", "Dump Part Addresses", function()
    dump_addresses("part_addresses.txt")
end)
```


<!-- ===== userdata/Player.md ===== -->

---
sidebar_position: 3
title: Player
---

# `Player`

Methods and properties on player objects returned by [`entity.GetPlayers()`](../libraries/entity#getplayers), [`entity.GetLocalPlayer()`](../libraries/entity#getlocalplayer), and [`entity.GetTarget()`](../libraries/entity#gettarget). The `Player` userdata is the cheat's pre-cached projection of a Roblox `Player` plus their `Character` rig - every property and bone position is already extracted from the engine, so reads are pointer chases (cheap), not RPCs.

| | |
|---|---|
| **Methods** | 4 (`GetBonePosition`, `GetBoneInstance`, `GetBoneSize`, `GetBoneRotation`) |
| **Properties** | 15 |
| **Verified live** | 4 of 4 methods, 15 of 15 properties (verified against R15 enemy character `n_nonoy2`, build `version-390ba09e7e944154`) |
| **Required event context** | none |
| **Side effects** | none - read-only userdata |

> **Method-call syntax.** Use `:` for methods (`player:GetBonePosition("Head")`), `.` for properties (`player.Health`).

> **Cache lifetime.** Like `Part`, the `Player` userdata is only safe to use during the same frame. Re-pull from `entity.GetPlayers()` each tick rather than storing references across frames.

> **Bones depend on a loaded character.** Verified live in a Studio-like scene where `entity.GetLocalPlayer()` returned a player but the character was not fully loaded into the cheat's bone cache: `GetBoneRotation("HumanoidRootPart")` returned `{0, 0, 0, 0, 0, 0, 0, 0, 0}`, `GetBonePosition`/`GetBoneSize` returned zero-filled `Vector3` userdata. **Always check `:GetBoneInstance(name) ~= nil` before trusting the other three bone-method returns.** This is true even for the `LocalPlayer` between spawns / on map load.

> **TeamColor is not a real `Color3`.** It is a separate userdata type. Its `.R/.G/.B` accessors return `0..255` byte values (not `0..1` floats like `Color3`), and `tostring` prints `0..65535` 16-bit channels. To convert it to a renderable `Color3`, use `Color3.fromRGB(p.TeamColor.R, p.TeamColor.G, p.TeamColor.B)`.

## Quick reference

### Methods

| Method | Signature | Returns | Status |
|---|---|---|---|
| [`GetBonePosition`](#getboneposition) | `player:GetBonePosition(boneName)` | `Vector3` (zero-filled if bone missing) | <span className="status-badge verified">verified</span> |
| [`GetBoneInstance`](#getboneinstance) | `player:GetBoneInstance(boneName)` | `Instance` or `nil` (`nil` = bone missing) | <span className="status-badge verified">verified</span> |
| [`GetBoneSize`](#getbonesize) | `player:GetBoneSize(boneName)` | `Vector3` (zero-filled if bone missing) | <span className="status-badge verified">verified</span> |
| [`GetBoneRotation`](#getbonerotation) | `player:GetBoneRotation(boneName)` | `table` (9-element matrix, all-zero if bone missing) | <span className="status-badge verified">verified</span> |

### Properties

| Name | Type | Description |
|---|---|---|
| `Name` | `string` | The Roblox username (e.g. `"n_nonoy2"`). |
| `DisplayName` | `string` | The Roblox display name (e.g. `"Frank"`). |
| `UserId` | `number` | The Roblox user ID. |
| `Team` | `string` | The team name (e.g. `"Enemy"`, `"Cowboys"`). Empty string when neutral. |
| `Weapon` | `string` | The equipped weapon model name (e.g. `"PrimaryDisplay"`, `"PistolDisplay"`). Empty string when unarmed. |
| `Position` | `Vector3` | Root part position. May be stale by 1 frame; prefer `GetBonePosition("HumanoidRootPart")` for live. |
| `Velocity` | `Vector3` | Root part linear velocity. |
| `Health` | `number` | Current health. |
| `MaxHealth` | `number` | Maximum health (for HP-bar normalization). |
| `IsAlive` | `boolean` | `true` while the humanoid is alive. |
| `IsVisible` | `boolean` | `true` if the cheat's visibility check (raycast from local camera to player chest) passes. |
| `IsEnemy` | `boolean` | `true` if the cheat classifies them as an enemy of the local player. Game-specific logic - TDM/CTF/FFA modes affect this. |
| `IsWhitelisted` | `boolean` | `true` if the player is in the cheat's whitelist (set via [`game.PlayerWhitelist`](../libraries/game#playerwhitelist)). |
| `TeamColor` | `userdata` | Team-color value with `.R/.G/.B` accessors (0..255). NOT a `Color3` - see warning above. |
| `BoundingBox` | `table` | Screen-space bounding rectangle as `{ x, y, w, h }` integers. `{ x = 0, y = 0, w = 0, h = 0 }` when off-screen. |

### R15 bone names

Verified live, these bone names resolve to real `Instance` userdata when the player is alive on an R15 rig:

```
HumanoidRootPart  Head
UpperTorso        LowerTorso
LeftFoot          RightFoot
LeftHand          RightHand
LeftUpperArm      LeftLowerArm
RightUpperArm     RightLowerArm
LeftUpperLeg      LeftLowerLeg
RightUpperLeg     RightLowerLeg
```

The legacy R6 name `Torso` is **not** a bone on R15 rigs - `GetBoneInstance("Torso")` returns `nil`. Use `UpperTorso` (chest area) or `LowerTorso` (waist) instead. See [`GetBoneInstance`](#getboneinstance) for the safe fallback pattern.

---

## `GetBonePosition`

```lua
player:GetBonePosition(boneName: string) -> Vector3
```

Returns the bone's center in world space as a `Vector3`. **Always returns a `Vector3` userdata**, even when the named bone does not exist - in that case, the components are all zero.

Verification on an R15 character:

| Call | Result |
|---|---|
| `target:GetBonePosition("Head")` | `Vector3` userdata, real coordinates |
| `target:GetBonePosition("HumanoidRootPart")` | `Vector3` userdata, real coordinates |
| `target:GetBonePosition("Torso")` (not on R15) | `Vector3` userdata, all-zero (`(0, 0, 0)`) |
| `target:GetBonePosition("garbage_name")` | `Vector3` userdata, all-zero |

Because zero positions are returned silently, **never use `GetBonePosition` alone as an existence check.** Use [`GetBoneInstance`](#getboneinstance) (returns `nil` for missing bones) or test the magnitude:

```lua
local head = target:GetBonePosition("Head")
if head.Magnitude > 0 then
    local sx, sy, on = utility.WorldToScreen(head)
    if on then
        draw.CircleFilled(sx, sy, 3, Color3.fromRGB(255, 0, 0))
    end
end
```

---

## `GetBoneInstance`

```lua
player:GetBoneInstance(boneName: string) -> Instance | nil
```

Returns the underlying Roblox `Instance` for the named bone, or `nil` if no such bone exists on the rig. **The only reliable existence check** of the four bone methods.

Use this when you want to fall back to a different bone name on rigs that lack the requested one (e.g. R15 vs R6 character models):

```lua
local function pick_aim_bone(target)
    local candidates = { "Head", "UpperTorso", "Torso", "HumanoidRootPart" }
    for _, name in ipairs(candidates) do
        if target:GetBoneInstance(name) then
            return name
        end
    end
    return nil
end

local bone = pick_aim_bone(target)
if bone then
    local pos = target:GetBonePosition(bone)
    -- ... aim
end
```

The returned `Instance` exposes the full set of [Instance methods](../userdata/Instance) (`GetChildren`, `GetAttributes`, `IsA`, etc.) and properties (`Position`, `Size`, `CFrame`-style `LookVector`, etc.) of the underlying `BasePart`.

---

## `GetBoneSize`

```lua
player:GetBoneSize(boneName: string) -> Vector3
```

Returns the bone's bounding-box size as a `Vector3` (x, y, z each in studs). Like `GetBonePosition`, returns a zero-filled `Vector3` for missing bones rather than `nil`.

Useful for proportional ESP - a head circle whose radius scales with the bone size:

```lua
local head_pos  = target:GetBonePosition("Head")
local head_size = target:GetBoneSize("Head")
if head_size.Magnitude > 0 then
    local sx, sy, on = utility.WorldToScreen(head_pos)
    if on then
        local radius = head_size.Y * 8
        draw.Circle(sx, sy, radius, Color3.fromRGB(255, 60, 60), 1)
    end
end
```

---

## `GetBoneRotation`

```lua
player:GetBoneRotation(boneName: string) -> table
```

Returns the bone's 3×3 world-space rotation matrix as a flat 9-element array, **row-major** (rows are `right`, `up`, `forward`).

Sample real return on R15 `HumanoidRootPart` (a player facing roughly +X +Z):
```
{ -0.6306, 0,      0.7761,
   0,      1.0000, 0,
  -0.7761, 0,      -0.6306 }
```

For missing bones the table is all zeros - same caveat as `GetBonePosition`. Detect with the determinant or with a `GetBoneInstance` precheck.

```lua
local rot = target:GetBoneRotation("UpperTorso")
local right   = Vector3.new(rot[1], rot[2], rot[3])
local up      = Vector3.new(rot[4], rot[5], rot[6])
local forward = Vector3.new(rot[7], rot[8], rot[9])

-- Project a 3-axis gizmo at the bone's location
local origin = target:GetBonePosition("UpperTorso")
local function axis_segment(axis_vec, color)
    local end_pt = origin + axis_vec * 2
    local sx1, sy1, on1 = utility.WorldToScreen(origin)
    local sx2, sy2, on2 = utility.WorldToScreen(end_pt)
    if on1 and on2 then
        draw.Line(sx1, sy1, sx2, sy2, color, 2)
    end
end
axis_segment(right,   Color3.fromRGB(255,  60,  60))
axis_segment(up,      Color3.fromRGB( 60, 255,  60))
axis_segment(forward, Color3.fromRGB( 60,  60, 255))
```

---

## Patterns

### Enemy ESP with health bars
```lua
cheat.Register("paint", function()
    local players = entity.GetPlayers(true)
    for i = 1, #players do
        local p = players[i]
        if p.IsAlive and p.IsVisible and not p.IsWhitelisted then
            local box   = p.BoundingBox
            local color = Color3.fromRGB(p.TeamColor.R, p.TeamColor.G, p.TeamColor.B)

            draw.Rect(box.x, box.y, box.w, box.h, color, 1)
            draw.TextOutlined(p.Name, box.x, box.y - 14,
                Color3.fromRGB(255, 255, 255), "Verdana", 1)

            -- HP bar to the right of the box
            local hp_ratio = p.MaxHealth > 0 and (p.Health / p.MaxHealth) or 0
            local bar_h    = math.floor(box.h * hp_ratio)
            local bar_x    = box.x + box.w + 2
            draw.RectFilled(bar_x, box.y, 3, box.h, Color3.fromRGB(40, 40, 40))
            draw.RectFilled(bar_x, box.y + (box.h - bar_h), 3, bar_h,
                Color3.fromRGB(60, 220, 60))
        end
    end
end)
```

### Aim-assist target picker (closest-to-crosshair head)
```lua
local function best_target(fov_radius)
    local mx, my = utility.GetMousePos()[1], utility.GetMousePos()[2]
    local best, best_d2 = nil, fov_radius * fov_radius
    for _, p in ipairs(entity.GetPlayers(true)) do
        if p.IsAlive and p.IsVisible and not p.IsWhitelisted then
            local head = p:GetBonePosition("Head")
            if head.Magnitude > 0 then
                local sx, sy, on = utility.WorldToScreen(head)
                if on then
                    local dx, dy = sx - mx, sy - my
                    local d2     = dx*dx + dy*dy
                    if d2 < best_d2 then
                        best, best_d2 = p, d2
                    end
                end
            end
        end
    end
    return best
end
```

### Team-color-respecting team / enemy split
```lua
local function partition_players()
    local enemies, allies = {}, {}
    for _, p in ipairs(entity.GetPlayers()) do
        if p.IsAlive then
            if p.IsEnemy then
                enemies[#enemies + 1] = p
            else
                allies[#allies + 1] = p
            end
        end
    end
    return enemies, allies
end
```

### R15 vs R6 bone fallback
```lua
local AIM_PRIORITY = {
    "Head",              -- both R15 and R6
    "UpperTorso",        -- R15 only
    "Torso",             -- R6 only
    "HumanoidRootPart",  -- both
}

local function aim_bone(target)
    for _, name in ipairs(AIM_PRIORITY) do
        if target:GetBoneInstance(name) then return name end
    end
end
```

### Whitelist-aware target loop
```lua
cheat.Register("onUpdate", function()
    local target = entity.GetTarget()
    if not target or target.IsWhitelisted then return end
    if not target.IsAlive or not target.IsVisible then return end

    local bone = aim_bone(target)
    if not bone then return end

    local pos = target:GetBonePosition(bone)
    local sx, sy, on = utility.WorldToScreen(pos)
    if on then
        game.SilentAim(sx, sy)
    end
end)
```
