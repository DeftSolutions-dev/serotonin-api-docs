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
