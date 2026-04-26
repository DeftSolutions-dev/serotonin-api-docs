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
