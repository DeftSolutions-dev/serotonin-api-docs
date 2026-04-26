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
