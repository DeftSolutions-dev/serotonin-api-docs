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
