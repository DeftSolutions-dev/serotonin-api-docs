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
