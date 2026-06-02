---
sidebar_position: 4
title: game
---

# `game`

Top-level entry point into the Roblox DataModel and a handful of cheat-side helpers (FFlag access, silent aim, player whitelist, window focus). 6 canonical functions plus a small set of pre-resolved fields.

| | |
|---|---|
| **Functions** | 6 (18 with aliases) |
| **Verified live** | 4 of 6 (SetFFlag and SilentAim are partial: documented from dump, not executed for safety) |
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
| [`IsFocused`](#isfocused)             | `() → boolean` | whether the Roblox window currently holds input focus, takes no arguments | <span className="status-badge verified">verified</span> |

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

## `IsFocused`

```lua
game.IsFocused() → boolean
```

Reports whether the Roblox window currently holds input focus. Takes no arguments (extra arguments are ignored) and returns a single `boolean`.

New in build `version-460909c4fe904aae`. Verified live: returned `false` across a 45-sample poll while the Roblox window was not the foreground application.

All three forms are bound: `IsFocused` / `isFocused` / `is_focused`. This is the one `game.*` function where the colon form is also safe: `game:IsFocused()` returns the same `boolean` as `game.IsFocused()` because the function ignores `self`.

```lua
cheat.register("onUpdate", function()
    if not game.IsFocused() then return end
    -- skip input-driven logic while the user is not in the Roblox window
end)
```

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
