---
sidebar_position: 1
title: Instance
---

# `Instance`

Methods and properties on Roblox `Instance` userdata returned by [`game.Workspace`](../libraries/game), [`:FindFirstChild`](#findfirstchild), and the rest of the tree-walk accessors. The `Instance` userdata is the cheat's bridge to the live Roblox DataModel: every property read crosses into the game's address space, and every method call is routed through Serotonin's safe-accessor layer.

| | |
|---|---|
| **Methods** | 18 |
| **Properties (verified)** | 38 (varies by underlying Roblox class) |
| **Verified live** | All 18 methods present, behavior verified on `game.Workspace` and `Camera` |
| **Required event context** | none |
| **Side effects** | `SetAttribute`, `SetHighlightOnTop`, `SetHighlightTransparency`, `Destroy` mutate state |

> **Naming.** All methods use PascalCase to mirror the Roblox API. Properties are case-sensitive and only the listed names are bound - accessing `instance.position` (lowercase) returns `nil`, not the value of `Position`.

> **Polymorphic property table.** Different Roblox classes expose different properties. `Camera` has `FieldOfView`/`Fov`/`LookVector`; `Part` has `Position`/`Size`/`Color`; `StringValue` has `Value`. Reading a property that does not exist on the underlying class returns `nil` without raising.

## Quick reference

### Tree walk

| Method | Signature | Returns | Status |
|---|---|---|---|
| [`GetChildren`](#getchildren) | `instance:GetChildren()` | `table` of direct children | <span className="status-badge verified">verified</span> |
| [`GetDescendants`](#getdescendants) | `instance:GetDescendants()` | `table` of all descendants | <span className="status-badge verified">verified</span> |
| [`FindFirstChild`](#findfirstchild) | `instance:FindFirstChild(name)` | `Instance` or nothing | <span className="status-badge verified">verified</span> |
| [`FindFirstChildOfClass`](#findfirstchildofclass) | `instance:FindFirstChildOfClass(className)` | `Instance` or nothing | <span className="status-badge verified">verified</span> |
| [`FindFirstAncestor`](#findfirstancestor) | `instance:FindFirstAncestor(name)` | `Instance` or nothing | <span className="status-badge verified">verified</span> |
| [`FindFirstAncestorOfClass`](#findfirstancestorofclass) | `instance:FindFirstAncestorOfClass(className)` | `Instance` or nothing | <span className="status-badge verified">verified</span> |
| [`FindFirstDescendant`](#findfirstdescendant) | `instance:FindFirstDescendant(name)` | `Instance` or nothing | <span className="status-badge verified">verified</span> |
| [`FindFirstDescendantOfClass`](#findfirstdescendantofclass) | `instance:FindFirstDescendantOfClass(className)` | `Instance` or nothing | <span className="status-badge verified">verified</span> |

### Type / hierarchy checks

| Method | Signature | Returns | Status |
|---|---|---|---|
| [`IsA`](#isa) | `instance:IsA(className)` | `boolean` (ClassName equality, not inheritance) | <span className="status-badge verified">verified</span> |
| [`IsDescendantOf`](#isdescendantof) | `instance:IsDescendantOf(ancestor)` | `boolean` | <span className="status-badge verified">verified</span> |
| [`IsAncestorOf`](#isancestorof) | `instance:IsAncestorOf(descendant)` | `boolean` | <span className="status-badge verified">verified</span> |

### Attributes

| Method | Signature | Returns | Status |
|---|---|---|---|
| [`GetAttributes`](#getattributes) | `instance:GetAttributes()` | array of `{ Name, Value, TypeName }` | <span className="status-badge verified">verified</span> |
| [`GetAttribute`](#getattribute) | `instance:GetAttribute(name)` | `any` or `nil` | <span className="status-badge verified">verified</span> |
| [`GetFirstAttributeOfType`](#getfirstattributeoftype) | `instance:GetFirstAttributeOfType(typeName)` | `any` | <span className="status-badge verified">verified</span> |
| [`SetAttribute`](#setattribute) | `instance:SetAttribute(name, value)` | nothing | <span className="status-badge verified">verified</span> |

### Visual / lifecycle

| Method | Signature | Returns | Status |
|---|---|---|---|
| [`SetHighlightOnTop`](#sethighlightontop) | `instance:SetHighlightOnTop()` | nothing | <span className="status-badge verified">verified</span> |
| [`SetHighlightTransparency`](#sethighlighttransparency) | `instance:SetHighlightTransparency(value)` | nothing | <span className="status-badge verified">verified</span> |
| [`Destroy`](#destroy) | `instance:Destroy()` | nothing | <span className="status-badge verified">verified</span> |

---

## `GetChildren`

```lua
instance:GetChildren() -> table
```

Returns an array of the instance's direct children. Empty table when the instance has none. The order matches Roblox's internal child order (which is generally insertion order).

Verified live on `game.Workspace`: returned a 1082-entry table on a populated Roblox place. Each entry is a fresh `Instance` userdata.

```lua
for _, child in ipairs(game.Workspace:GetChildren()) do
    print(child.Name, child.ClassName)
end
```

---

## `GetDescendants`

```lua
instance:GetDescendants() -> table
```

Returns a flat array of every descendant in the subtree (children, grandchildren, ...). Order is depth-first. Use this when you need to enumerate everything in the subtree at once. For a single-target lookup, [`FindFirstDescendant`](#findfirstdescendant) is cheaper and **does** walk the full subtree (verified live: `ws:FindFirstDescendant("Camera")` returns the Camera even though it is a direct child).

:::warning Cost
On a populated Workspace `GetDescendants` returns tens of thousands of entries. Cache the result instead of calling it every frame.
:::

```lua
local cache = {}
cheat.Register("onUpdate", function()
    if #cache == 0 then
        cache = game.Workspace:GetDescendants()
    end
end)
```

---

## `FindFirstChild`

```lua
instance:FindFirstChild(name: string) -> Instance
```

Returns the first **direct** child whose `Name` matches `name`. Searches one level only.

Verified arg shape:

| Call | Result |
|---|---|
| `ws:FindFirstChild("Camera")` | `Instance` userdata |
| `ws:FindFirstChild("zzz_not_real")` | nothing (no return value, `nil` in expressions) |
| `ws:FindFirstChild(nil)` | error: `bad argument #1 (string expected, got nil)` |

```lua
local map = game.Workspace:FindFirstChild("Map")
if map then
    print("found map with", #map:GetChildren(), "children")
end
```

---

## `FindFirstChildOfClass`

```lua
instance:FindFirstChildOfClass(className: string) -> Instance
```

Returns the first direct child whose `ClassName` equals `className`. Like `IsA`, this is **strict ClassName equality** - `FindFirstChildOfClass("BasePart")` will not find a `Part`.

Verified live: `ws:FindFirstChildOfClass("Camera")` returned the workspace Camera userdata.

```lua
local cam = game.Workspace:FindFirstChildOfClass("Camera")
if cam then print("FOV (rad):", cam.FieldOfView) end
```

---

## `FindFirstAncestor`

```lua
instance:FindFirstAncestor(name: string) -> Instance
```

Walks up the `.Parent` chain and returns the first ancestor whose `Name` matches `name`. Returns nothing if no such ancestor exists.

Useful when you have a deep descendant (a hat, a weapon model accessory) and need its parent character / model:

```lua
local rootpart = part:FindFirstAncestor("HumanoidRootPart")
```

---

## `FindFirstAncestorOfClass`

```lua
instance:FindFirstAncestorOfClass(className: string) -> Instance
```

Walks up the `.Parent` chain and returns the first ancestor whose `ClassName` equals `className`.

```lua
local model = inst:FindFirstAncestorOfClass("Model")
```

---

## `FindFirstDescendant`

```lua
instance:FindFirstDescendant(name: string) -> Instance
```

Returns the first descendant with the given `Name`, walking the **full** subtree recursively (verified live: `ws:FindFirstDescendant("Camera")` returns the Camera, `part:FindFirstDescendant("Foo")` returns nothing when no such descendant exists). The exact traversal order is implementation-defined; treat it as "any descendant matching that name".

:::info When to use `GetDescendants` instead
If your script needs predictable order or has to match additional criteria (Name + ClassName + attribute value), iterate `GetDescendants()` yourself.
:::

---

## `FindFirstDescendantOfClass`

```lua
instance:FindFirstDescendantOfClass(className: string) -> Instance
```

Same as `FindFirstDescendant` but matches by `ClassName`. Strict equality (no inheritance walk - like [`IsA`](#isa)). Verified live: `ws:FindFirstDescendantOfClass("Camera")` returns the workspace Camera.

---

## `IsA`

```lua
instance:IsA(className: string) -> boolean
```

:::danger Not inheritance-aware
This runtime's `IsA` does **not** walk the Roblox class hierarchy. It compares `instance.ClassName` to the argument string with a direct equality check.
:::

Verified live on `game.Workspace`:

| Call | Result |
|---|---|
| `ws:IsA("Workspace")` | `true` |
| `ws:IsA("Instance")` | `false` (Workspace inherits from Instance in real Roblox, but this `IsA` ignores that) |
| `ws:IsA("Part")` | `false` |

If you need to match "any kind of part", check `ClassName` against a known set of concrete classes:

```lua
local PART_CLASSES = {
    Part = true, MeshPart = true, WedgePart = true,
    TrussPart = true, CornerWedgePart = true,
}
for _, child in ipairs(game.Workspace:GetChildren()) do
    if PART_CLASSES[child.ClassName] then
        print("part:", child.Name)
    end
end
```

---

## `IsDescendantOf`

```lua
instance:IsDescendantOf(ancestor: Instance) -> boolean
```

Returns `true` if `instance` appears anywhere in `ancestor`'s subtree.

```lua
local cam = game.Workspace:FindFirstChildOfClass("Camera")
print(cam:IsDescendantOf(game.Workspace))   -- true
```

---

## `IsAncestorOf`

```lua
instance:IsAncestorOf(descendant: Instance) -> boolean
```

Inverse of `IsDescendantOf`. Returns `true` if `descendant` is anywhere in `instance`'s subtree.

---

## `GetAttributes` / `GetAttribute` / `SetAttribute` / `GetFirstAttributeOfType`

```lua
instance:GetAttributes() -> table
instance:GetAttribute(name: string) -> table | nil
instance:GetFirstAttributeOfType(typeName: string) -> table | nil
instance:SetAttribute(name: string, value: any) -> nothing
```

:::info Reads work, writes do not persist
Re-verified live in build `version-390ba09e7e944154`:

- **`GetAttributes()` and `GetAttribute(name)` work** for attributes already populated by the Roblox engine or the place script. Verified: `game.Workspace:GetAttribute("RbxLegacyAnimationBlending")` returns `{Value=true, Name="RbxLegacyAnimationBlending", TypeName="bool"}`.
- **`SetAttribute(name, value)` succeeds without error but does not persist.** Verified across `number`, `string`, `bool`, and `Vector3` value types, with both immediate and one-frame-deferred `GetAttribute` reads — every Set call was silently dropped, every following `GetAttribute` returned `nil`, and `GetAttributes()` continued to return what it returned before.

So this API is effectively **read-only** in this build. Use it to read values set by the place / engine; do not rely on it for cross-script state. For your own state, use `cheat.Register` event-scoped variables, file IO, or the `ui.GetValue` / `ui.SetValue` widget round-trip.
:::

### `GetAttribute(name)` returns a record, not the raw value

Unlike Roblox's standard API where `instance:GetAttribute(name)` returns the value directly, this runtime returns a **3-key record table** with the same shape as one entry of `GetAttributes()`:

```lua
{ Name = string, Value = any, TypeName = string }
```

Verified:

| Call | Result |
|---|---|
| `ws:GetAttribute("RbxLegacyAnimationBlending")` | `{ Name = "RbxLegacyAnimationBlending", Value = true, TypeName = "bool" }` |
| `ws:GetAttribute("InsertPoint")` (not set) | `nil` |
| `ws:GetAttribute("Retargeting")` (not set) | `nil` |
| `ws:GetAttribute("AnimationWeightedBlendFix")` (not set) | `nil` |

Read the value through `.Value`:

```lua
local rec = game.Workspace:GetAttribute("RbxLegacyAnimationBlending")
if rec then
    print("blend mode:", rec.Value, "type:", rec.TypeName)
end
```

### `GetAttributes()` returns an array of records

Iterate with `ipairs`, not `pairs` — the result is an array, not a name-keyed map. Each record has the same shape as the `GetAttribute` return.

Verified live: `game.Workspace:GetAttributes()` returned `{ [1] = { Name = "RbxLegacyAnimationBlending", Value = true, TypeName = "bool" } }`. `TypeName` follows the Roblox attribute taxonomy: `"bool"`, `"string"`, `"number"`, `"Vector3"`, `"Color3"`, `"UDim2"`, `"BrickColor"`, etc.

```lua
for _, attr in ipairs(game.Workspace:GetAttributes()) do
    print(attr.Name, attr.TypeName, attr.Value)
end
```

### `GetFirstAttributeOfType(typeName)`

Returns the first attribute record whose `TypeName` matches the argument, or `nil` when no match. Same record shape as `GetAttribute`.

### `SetAttribute(name, value)` — non-functional in this build

The call accepts `name: string` plus `value` of any of the standard attribute types (`bool`, `number`, `string`, `Vector3`, `Color3`, ...) and returns nothing. **It silently no-ops**: the value is not stored, and the next `GetAttribute(name)` returns `nil`.

| Call | Verified result |
|---|---|
| `part:SetAttribute("Key", 42)`            | succeeds, no error, value is not stored |
| `part:SetAttribute("Key", "abc")`         | succeeds, not stored |
| `part:SetAttribute("Key", true)`          | succeeds, not stored |
| `part:SetAttribute("Key", Vector3.new(1, 2, 3))` | succeeds, not stored |
| `instance:SetAttribute("Foo", nil)`       | error: `"bad argument #3 to '?' (unsupported type for attribute value)"` (cannot clear via `nil`) |

```lua
local part = game.Workspace:FindFirstChild("Part")
if part then
    part:SetAttribute("MyFlag", true)
    print(part:GetAttribute("MyFlag"))
end
```

---

## `SetHighlightOnTop`

```lua
instance:SetHighlightOnTop() -> nothing
```

For instances of class `Highlight`, switches the highlight to render on top of everything (ignoring depth). No-op for other instance classes.

```lua
local hl = Instance.new("Highlight")
hl.Parent = part
hl:SetHighlightOnTop()
```

---

## `SetHighlightTransparency`

```lua
instance:SetHighlightTransparency(value: number) -> nothing
```

Sets the highlight's `FillTransparency`. Value range `0..1` (0 = fully opaque fill, 1 = fully transparent fill).

---

## `Destroy`

```lua
instance:Destroy() -> nothing
```

Destroys the instance (parents to `nil`, locks the object). Standard Roblox semantics.

:::warning Side effect on the live game
This actually removes the instance from the Roblox game tree. Don't call it on `Workspace`, `Players`, or any service - it can crash the client.
:::

---

## Properties

Property reads return `nil` when the underlying class doesn't expose that field. The cheat exposes the union of fields across all common Roblox classes.

| Name | Type | Description |
|---|---|---|
| `Name` | `string` | The name of the instance. Verified `"Workspace"` on `game.Workspace`. |
| `ClassName` | `string` | The class name of the instance. Verified `"Workspace"` on `game.Workspace`. |
| `Parent` | `Instance` | The parent in the hierarchy (`Workspace.Parent` is the DataModel userdata). |
| `Address` | `number` | The low 32 bits of the C++ instance pointer. Verified `488443520` on `game.Workspace` in one run. |
| `Character` | `Instance` | A Player's character model. |
| `Position` | `Vector3` | The 3D position of a Part. |
| `Size` | `Vector3` | The size of a Part. |
| `Velocity` | `Vector3` | The velocity of a Part. |
| `Rotation` | `Vector3` | The rotation of a Part (Euler XYZ in degrees). |
| `Color` | `Color3` | The Color3 value of a Part. |
| `Material` | `string` | The material of a Part. |
| `Transparency` | `number` | The transparency of a Part (0-1). |
| `Reflectance` | `number` | The reflectance of a Part (0-1). |
| `CanCollide` | `boolean` | Whether a Part can be collided with. |
| `Health` | `number` | The current health of a Humanoid. |
| `MaxHealth` | `number` | The maximum health of a Humanoid. |
| `MoveDirection` | `Vector3` | The move direction of a Humanoid. |
| `MeshId` | `string` | The mesh asset ID of a MeshPart. |
| `TextureId` | `string` | The texture asset ID. |
| `SoundId` | `string` | The sound asset ID. |
| `LookVector` | `Vector3` | The look direction of a Camera (CFrame's forward axis). Verified userdata on `Camera`. |
| `RightVector` | `Vector3` | The right direction of a Camera. Verified userdata on `Camera`. |
| `UpVector` | `Vector3` | The up direction of a Camera. Verified userdata on `Camera`. |
| `Fov` / `FieldOfView` | `number` | The field of view of a Camera **in radians**. Verified `1.2217305898666` (= 70°) on `Camera`. Both names are aliases for the same field. |
| `CameraSubject` | `Instance` | The subject of the Camera. |
| `FillColor` | `Color3` | The fill color of a Highlight. |
| `OutlineColor` | `Color3` | The outline color of a Highlight. |
| `FillTransparency` | `number` | The fill transparency of a Highlight. |
| `DepthMode` | `number` | The depth mode of a Highlight. |
| `Value` | `any` | The value of a ValueBase object. |
| `StringValue` | `string` | The value of a StringValue instance. |
| `NumberValue` | `number` | The value of a NumberValue instance. |
| `IntValue` | `number` | The value of an IntValue instance. |
| `BoolValue` | `boolean` | The value of a BoolValue instance. |
| `ObjectValue` | `Instance` | The value of an ObjectValue instance. |
| `TextLabelValue` | `string` | The text content of a TextLabel. |
| `TextColor3` | `Color3` | The text color of a TextLabel. |

:::warning No `CFrame` property
Verified live: `cam.CFrame` returned `nil` on a real Camera. The cheat exposes the CFrame's components (`LookVector`, `RightVector`, `UpVector`, `Position`) but **not** the CFrame itself. To reconstruct orientation use the three direction vectors plus `Position`.
:::

---

## Patterns

### Walk children with class filter
```lua
local PART_CLASSES = {
    Part = true, MeshPart = true, WedgePart = true,
    TrussPart = true, CornerWedgePart = true,
}

local function visible_parts(root)
    local out = {}
    for _, child in ipairs(root:GetChildren()) do
        if PART_CLASSES[child.ClassName] and child.Transparency < 1 then
            out[#out + 1] = child
        end
    end
    return out
end
```

### Read all attributes from a model
```lua
local function dump_attributes(inst)
    print(inst.Name, inst.ClassName)
    for _, a in ipairs(inst:GetAttributes()) do
        print(string.format("  %-24s %-10s %s",
            a.Name, a.TypeName, tostring(a.Value)))
    end
end

dump_attributes(game.Workspace)
```

### Camera info HUD
```lua
cheat.Register("onPaint", function()
    local cam = game.Workspace:FindFirstChildOfClass("Camera")
    if not cam then return end
    local fov_deg = cam.FieldOfView * 57.2957795
    local lv = cam.LookVector
    draw.TextOutlined(string.format("FOV %.1f deg", fov_deg),
        10, 10, Color3.fromRGB(255, 255, 255), "ConsolasBold", 1)
    draw.TextOutlined(string.format("Look %.2f %.2f %.2f", lv.X, lv.Y, lv.Z),
        10, 26, Color3.fromRGB(200, 200, 200), "ConsolasBold", 1)
end)
```

### Find a deep descendant
```lua
-- FindFirstDescendant searches the subtree but order is implementation-defined.
-- For predictable behavior, walk GetDescendants yourself.
local function find_by_name_class(root, name, cls)
    for _, d in ipairs(root:GetDescendants()) do
        if d.Name == name and d.ClassName == cls then return d end
    end
    return nil
end

local hrp = find_by_name_class(game.Workspace, "HumanoidRootPart", "Part")
```

### Highlight all parts in a model
```lua
local function highlight_model(model, fill_alpha)
    for _, d in ipairs(model:GetDescendants()) do
        if d.ClassName == "Part" or d.ClassName == "MeshPart" then
            local hl = Instance.new("Highlight")
            hl.FillColor = Color3.fromRGB(255, 90, 90)
            hl.OutlineColor = Color3.fromRGB(255, 255, 255)
            hl.Parent = d
            hl:SetHighlightOnTop()
            hl:SetHighlightTransparency(fill_alpha or 0.5)
        end
    end
end
```
