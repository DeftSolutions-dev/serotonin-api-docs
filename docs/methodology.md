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
