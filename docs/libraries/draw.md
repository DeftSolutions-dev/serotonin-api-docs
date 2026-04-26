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
