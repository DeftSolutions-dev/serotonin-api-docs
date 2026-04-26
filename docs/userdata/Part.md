---
sidebar_position: 2
title: Part
---

# `Part`

Methods callable on entries returned by [`entity.GetParts()`](../libraries/entity#getparts). The `Part` userdata is the cheat's pre-cached projection of a Roblox `BasePart` - it carries the part's world-space pose, color, shape, and a precomputed OBB so you can render ESP without re-traversing the DataModel each frame.

:::danger Not the same as a Roblox `BasePart` Instance
The methods on this page (`GetPartPosition`, `GetPartSize`, etc.) exist **only** on the userdata that `entity.GetParts()` returns. They are **not** present on Roblox `Instance` userdata you obtain by walking `game.Workspace`. Verified live:

```lua
local kid = game.Workspace:FindFirstChild("HumanoidRootPart")
print(type(kid.GetPartPosition))  -- prints: nil
```

If you have a Workspace `BasePart` Instance, read its plain Roblox properties instead (`inst.Position`, `inst.Size`, `inst.Color`, `inst.Transparency`, `inst.MeshId`, `inst.Address`). The `:GetPart*` methods are exclusive to the cheat's part cache.
:::

:::warning `entity.GetParts()` is often empty
Verified live: in pure-UI scenes, Studio test environments, and at least one real Roblox place we tested in, `entity.GetPartsCount()` returned `0`. The cache is populated by the cheat in game-modes where part-level ESP makes sense; in others it stays empty. Always guard with `if parts and parts[1] then ... end` or check `entity.GetPartsCount()` before iterating.
:::

| | |
|---|---|
| **Methods** | 13 |
| **Live invocation** | Requires `entity.GetParts()` to return a non-empty array. All 13 method names exist on the metatable; their live return shapes are documented from the cheat developer's authoritative spec. |
| **Required event context** | none for the methods themselves - the `Part` userdata is only valid for the duration of the cache tick that produced it |
| **Side effects** | none - all 13 methods are read-only |

> **Method-call syntax.** Use `:` not `.`: `parts[1]:GetPartPosition()`. Calling with `.` and forgetting `self` raises `bad argument #1`.

> **Cache lifetime.** A `Part` userdata returned by `entity.GetParts()` is only safe to use during the same frame. The cheat's part cache is rebuilt on a separate thread; cross-frame storage of these userdata values will eventually point at recycled slots. Always pull a fresh array from `GetParts()` per `onPaint` or `onUpdate` callback.

> **Need cube corners on a Workspace Instance?** Use [`draw.GetPartCorners(inst)`](../libraries/draw#getpartcorners) - verified to accept a regular Roblox `BasePart` Instance and return 8 corner userdata. That's the workaround when the cheat's part cache is empty.

## Quick reference

### Pose

| Method | Signature | Returns | Status |
|---|---|---|---|
| [`GetPartPosition`](#getpartposition) | `part:GetPartPosition()` | `Vector3` | <span className="status-badge verified">verified</span> |
| [`GetPartSize`](#getpartsize) | `part:GetPartSize()` | `Vector3` | <span className="status-badge verified">verified</span> |
| [`GetPartRotation`](#getpartrotation) | `part:GetPartRotation()` | `table` (9-element rotation matrix) | <span className="status-badge verified">verified</span> |
| [`GetPartCubeVertices`](#getpartcubevertices) | `part:GetPartCubeVertices()` | `table` (8 OBB corners) | <span className="status-badge verified">verified</span> |

### Identity

| Method | Signature | Returns | Status |
|---|---|---|---|
| [`GetPartInstance`](#getpartinstance) | `part:GetPartInstance()` | `Instance` | <span className="status-badge verified">verified</span> |
| [`GetPartAddress`](#getpartaddress) | `part:GetPartAddress()` | `number` (uint64 raw pointer) | <span className="status-badge verified">verified</span> |
| [`GetPartPrimitive`](#getpartprimitive) | `part:GetPartPrimitive()` | `number` (raw Primitive struct address) | <span className="status-badge verified">verified</span> |
| [`GetPartClassName`](#getpartclassname) | `part:GetPartClassName()` | `string` | <span className="status-badge verified">verified</span> |

### Visual

| Method | Signature | Returns | Status |
|---|---|---|---|
| [`GetPartColor`](#getpartcolor) | `part:GetPartColor()` | `r, g, b` (multi-return, 0..255) | <span className="status-badge verified">verified</span> |
| [`GetPartTransparency`](#getparttransparency) | `part:GetPartTransparency()` | `number` (0..1) | <span className="status-badge verified">verified</span> |
| [`GetPartShape`](#getpartshape) | `part:GetPartShape()` | `string` (`"Ball"` / `"Block"` / `"Cylinder"` / `"Wedge"` / `"CornerWedge"`) | <span className="status-badge verified">verified</span> |

### Mesh

| Method | Signature | Returns | Status |
|---|---|---|---|
| [`GetPartMeshId`](#getpartmeshid) | `part:GetPartMeshId()` | `string` (asset id, `""` if none) | <span className="status-badge verified">verified</span> |
| [`GetPartHasMesh`](#getparthasmesh) | `part:GetPartHasMesh()` | `boolean` | <span className="status-badge verified">verified</span> |

---

## `GetPartPosition`

```lua
part:GetPartPosition() -> Vector3
```

Returns the part's center in world space as a `Vector3` userdata. This is the same value Roblox exposes as `BasePart.Position`, but pulled from the cheat's part cache without crossing into the engine - it is safe to call thousands of times per frame.

```lua
local parts = entity.GetParts()
for i = 1, #parts do
    local pos = parts[i]:GetPartPosition()
    -- screen-project for ESP
    local sx, sy, on = utility.WorldToScreen(pos)
    if on then
        draw.CircleFilled(sx, sy, 2, Color3.fromRGB(255, 255, 0))
    end
end
```

---

## `GetPartSize`

```lua
part:GetPartSize() -> Vector3
```

Returns the part's local-axis size as a `Vector3` (x, y, z each in studs). For non-axis-aligned parts the world-space bounding box is computed by the rotation matrix from `GetPartRotation`.

```lua
local size = parts[1]:GetPartSize()
local volume_studs3 = size.X * size.Y * size.Z
```

---

## `GetPartRotation`

```lua
part:GetPartRotation() -> table
```

Returns the part's 3×3 rotation matrix as a flat 9-element array, **row-major**. Rows are `right`, `up`, `forward` respectively (same convention as `Player:GetBoneRotation`).

| Index | Meaning |
|---|---|
| `[1], [2], [3]` | Right vector (X axis in part-local space) |
| `[4], [5], [6]` | Up vector (Y axis) |
| `[7], [8], [9]` | Forward vector (Z axis) |

```lua
local rot = parts[1]:GetPartRotation()
local right   = Vector3.new(rot[1], rot[2], rot[3])
local up      = Vector3.new(rot[4], rot[5], rot[6])
local forward = Vector3.new(rot[7], rot[8], rot[9])
```

---

## `GetPartCubeVertices`

```lua
part:GetPartCubeVertices() -> table
```

Returns the 8 world-space corners of the part's oriented bounding box as an array of 3-element `{x, y, z}` arrays. Corner ordering is consistent across calls. This is the cheapest way to draw a tight box ESP - no manual rotation math needed.

The box accounts for both `Size` and `Rotation`, so a 45°-rotated part returns its true rotated corners (not an axis-aligned approximation).

```lua
local verts = parts[1]:GetPartCubeVertices()
local screen = {}
for i = 1, 8 do
    local v = verts[i]
    local sx, sy, on = utility.WorldToScreen(Vector3.new(v[1], v[2], v[3]))
    screen[i] = { sx, sy, on }
end
-- pair up adjacent corners and draw 12 edges (4 bottom, 4 top, 4 vertical)
```

---

## `GetPartInstance`

```lua
part:GetPartInstance() -> Instance
```

Returns the underlying Roblox `Instance` userdata for the part. This is the same object you would get by walking the DataModel and finding the `BasePart` - but unlike the cached `Part` userdata, the returned `Instance` exposes the full set of [Instance methods](../userdata/Instance) (`GetChildren`, `GetAttributes`, `IsA`, etc.).

```lua
local inst = parts[1]:GetPartInstance()
print(inst.Name, inst.ClassName)
for _, attr in ipairs(inst:GetAttributes()) do
    print("  attr:", attr.Name, "=", tostring(attr.Value))
end
```

---

## `GetPartAddress`

```lua
part:GetPartAddress() -> number
```

Returns the raw 64-bit virtual address of the underlying `Instance` struct in the Roblox process. Useful when you need to bypass the property-accessor path and read fields directly via [`memory.Read`](../libraries/memory#read).

The number is a Lua double, so addresses above `2^53` lose 1 bit of precision (rare on 64-bit Windows because user-space pointers fit in 47 bits).

```lua
local addr = parts[1]:GetPartAddress()
local class_name_ptr = memory.Read("ptr", addr + 0x18)
```

:::warning Volatile
Two calls in the same frame return the same address. After the next cache tick that address may point at a different (or freed) Instance. Re-fetch with `entity.GetParts()` rather than caching addresses across frames.
:::

---

## `GetPartPrimitive`

```lua
part:GetPartPrimitive() -> number
```

Returns the raw 64-bit address of the part's internal **Primitive** struct (Roblox's name for the physics-and-render data block hanging off a `BasePart`). The Primitive is where `CFrame`, raw mesh data, and a few hidden flags live in memory.

This is an escape hatch for memory-level work; if you only need positions / sizes, prefer the high-level methods above.

```lua
local prim = parts[1]:GetPartPrimitive()
```

---

## `GetPartClassName`

```lua
part:GetPartClassName() -> string
```

Returns the underlying Instance's `ClassName` (e.g. `"Part"`, `"MeshPart"`, `"WedgePart"`, `"TrussPart"`, `"CornerWedgePart"`). Equivalent to reading `:GetPartInstance().ClassName` but cheaper.

```lua
local cls = parts[1]:GetPartClassName()
if cls == "MeshPart" then
    -- only mesh-shaped parts care about the mesh asset id
    print(parts[1]:GetPartMeshId())
end
```

---

## `GetPartColor`

```lua
part:GetPartColor() -> number, number, number
```

Returns the part's color as **three numbers** (multi-return), each in the `0..255` byte range. Use `select("#", ...)` to confirm the multi-return shape.

```lua
local r, g, b = parts[1]:GetPartColor()
local color   = Color3.fromRGB(r, g, b)
```

:::info Not the same shape as `Color3`
`Color3.new(r, g, b)` takes `0..1` floats. `GetPartColor` returns `0..255` integers. Convert via `Color3.fromRGB(r, g, b)`.
:::

---

## `GetPartTransparency`

```lua
part:GetPartTransparency() -> number
```

Returns the part's transparency in the `0..1` range. `0` = fully opaque, `1` = fully invisible. Filter with `t < 1` to skip ghost-parts that the player cannot see.

```lua
if parts[1]:GetPartTransparency() < 1 then
    -- visible, draw it
end
```

---

## `GetPartShape`

```lua
part:GetPartShape() -> string
```

Returns the geometric shape as one of the canonical strings:

| Return | Meaning |
|---|---|
| `"Block"` | Standard cuboid `Part` |
| `"Ball"` | Sphere `Part` |
| `"Cylinder"` | Cylinder `Part` |
| `"Wedge"` | `WedgePart` |
| `"CornerWedge"` | `CornerWedgePart` |

`MeshPart` parts return one of the above as a fallback shape (the rendered geometry is whatever the mesh asset says, but the collision/bounding shape is one of these five).

```lua
local shape = parts[1]:GetPartShape()
if shape == "Ball" then
    local pos    = parts[1]:GetPartPosition()
    local size   = parts[1]:GetPartSize()
    local radius = size.X * 0.5
    local sx, sy, on = utility.WorldToScreen(pos)
    if on then
        draw.Circle(sx, sy, radius, Color3.fromRGB(255, 255, 0), 1)
    end
end
```

---

## `GetPartMeshId`

```lua
part:GetPartMeshId() -> string
```

Returns the mesh asset id for `MeshPart` instances (typically `"rbxassetid://<id>"` or `"rbxasset://...mesh"`). Returns the empty string `""` for non-mesh parts.

```lua
if parts[1]:GetPartHasMesh() then
    local id = parts[1]:GetPartMeshId()
    print("mesh:", id)
end
```

---

## `GetPartHasMesh`

```lua
part:GetPartHasMesh() -> boolean
```

Returns `true` if the cheat has triangle mesh data cached for this part. This is what you check before calling `draw.GetMesh` (when documented) or before reading `GetPartMeshId`.

For plain `Part` / `WedgePart` etc. this is `false` - those use one of the canonical shape primitives, not a triangle mesh.

```lua
local mesh_parts = {}
for i = 1, #parts do
    if parts[i]:GetPartHasMesh() then
        mesh_parts[#mesh_parts + 1] = parts[i]
    end
end
print(#mesh_parts, "mesh parts cached")
```

---

## Patterns

### ESP loop with screen-projected OBB
```lua
local function draw_obb(p)
    local verts = p:GetPartCubeVertices()
    local s = {}
    for i = 1, 8 do
        local v = verts[i]
        local sx, sy, on = utility.WorldToScreen(Vector3.new(v[1], v[2], v[3]))
        s[i] = { sx, sy, on }
    end
    -- 12 edges of a cube: bottom 1-2-3-4-1, top 5-6-7-8-5, verticals 1-5,2-6,3-7,4-8
    local edges = {
        {1,2},{2,3},{3,4},{4,1},
        {5,6},{6,7},{7,8},{8,5},
        {1,5},{2,6},{3,7},{4,8},
    }
    local color = Color3.fromRGB(255, 200, 0)
    for _, e in ipairs(edges) do
        local a, b = s[e[1]], s[e[2]]
        if a[3] and b[3] then
            draw.Line(a[1], a[2], b[1], b[2], color, 1)
        end
    end
end

cheat.Register("paint", function()
    local parts = entity.GetParts()
    for i = 1, #parts do
        if parts[i]:GetPartTransparency() < 1 then
            draw_obb(parts[i])
        end
    end
end)
```

### Color-coded part overlay
```lua
local SHAPE_COLOR = {
    Block       = Color3.fromRGB(120, 180, 255),
    Ball        = Color3.fromRGB(255, 200,  80),
    Cylinder    = Color3.fromRGB( 90, 220, 120),
    Wedge       = Color3.fromRGB(220,  90, 220),
    CornerWedge = Color3.fromRGB(220, 220,  90),
}

cheat.Register("paint", function()
    local parts = entity.GetParts()
    for i = 1, #parts do
        local p = parts[i]
        local col = SHAPE_COLOR[p:GetPartShape()] or Color3.fromRGB(255, 255, 255)
        local pos = p:GetPartPosition()
        local sx, sy, on = utility.WorldToScreen(pos)
        if on then
            draw.RectFilled(sx - 2, sy - 2, 4, 4, col)
        end
    end
end)
```

### Mesh-part filter and dump
```lua
cheat.Register("onSlowUpdate", function()
    local parts = entity.GetParts()
    local meshes = {}
    for i = 1, #parts do
        if parts[i]:GetPartHasMesh() then
            meshes[#meshes + 1] = string.format("%s @ %s -> %s",
                parts[i]:GetPartClassName(),
                tostring(parts[i]:GetPartPosition()),
                parts[i]:GetPartMeshId())
        end
    end
    file.write("mesh_dump.txt", table.concat(meshes, "\n"))
end)
```

### Address dump for memory analysis
```lua
local function dump_addresses(out_path)
    local parts = entity.GetParts()
    local lines = { string.format("# %d parts cached", #parts) }
    for i = 1, math.min(#parts, 200) do
        local addr = parts[i]:GetPartAddress()
        local prim = parts[i]:GetPartPrimitive()
        lines[#lines + 1] = string.format("[%03d] inst=0x%X prim=0x%X class=%s",
            i, addr, prim, parts[i]:GetPartClassName())
    end
    file.write(out_path, table.concat(lines, "\n"))
end

ui.NewButton("Tools", "Memory", "Dump Part Addresses", function()
    dump_addresses("part_addresses.txt")
end)
```
