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
