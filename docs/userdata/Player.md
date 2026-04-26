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
