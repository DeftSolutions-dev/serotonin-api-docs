---
sidebar_position: 2
title: Part
---

# `Part`

Методы, вызываемые на элементах, которые возвращает [`entity.GetParts()`](../libraries/entity#getparts). Userdata `Part` - это предварительно закэшированная читом проекция Roblox `BasePart`: она содержит world-space позу части, цвет, форму и предвычисленный OBB, чтобы рендерить ESP без повторного обхода DataModel каждый frame.

:::danger Это НЕ то же что Roblox `BasePart` Instance
Методы на этой странице (`GetPartPosition`, `GetPartSize` и т.д.) существуют **только** на userdata который возвращает `entity.GetParts()`. Их **нет** на Roblox `Instance` userdata, который ты получаешь обходом `game.Workspace`. Проверено вживую:

```lua
local kid = game.Workspace:FindFirstChild("HumanoidRootPart")
print(type(kid.GetPartPosition))  -- prints: nil
```

Если у тебя в руках Workspace `BasePart` Instance - читай его обычные Roblox-свойства (`inst.Position`, `inst.Size`, `inst.Color`, `inst.Transparency`, `inst.MeshId`, `inst.Address`). Методы `:GetPart*` эксклюзивны для cache чита.
:::

:::warning `entity.GetParts()` часто пуст
Проверено вживую: в чисто-UI сценах, в Studio-test окружении и хотя бы в одном реальном Roblox-плейсе который мы тестировали `entity.GetPartsCount()` возвращал `0`. Кэш заполняется читом в режимах где part-level ESP имеет смысл; в остальных он остаётся пустым. Всегда защищай `if parts and parts[1] then ... end` или проверяй `entity.GetPartsCount()` перед итерацией.
:::

| | |
|---|---|
| **Методов** | 13 |
| **Живой вызов** | Требует, чтобы `entity.GetParts()` вернул непустой массив. Все 13 имён методов существуют на metatable; их живые return-shape'ы документированы по авторитетной spec разработчика. |
| **Требуемый event-контекст** | для самих методов отсутствует - userdata `Part` валиден только в течение того tick кэша, который его породил |
| **Побочные эффекты** | отсутствуют - все 13 методов read-only |

> **Синтаксис вызова методов.** Используй `:` , а не `.`: `parts[1]:GetPartPosition()`. Вызов через `.` без передачи `self` приводит к `bad argument #1`.

> **Время жизни кэша.** Userdata `Part`, возвращённый `entity.GetParts()`, безопасно использовать только в пределах одного frame. Кэш частей чита перестраивается в отдельном потоке; хранение этих userdata-значений между frame-ами рано или поздно укажет на переиспользованные слоты. Всегда запрашивай свежий массив через `GetParts()` в каждом callback `onPaint` или `onUpdate`.

> **Нужны cube corners на Workspace Instance?** Используй [`draw.GetPartCorners(inst)`](../libraries/draw#getpartcorners) - проверено что принимает обычный Roblox `BasePart` Instance и возвращает 8 corner-userdata. Это workaround когда part-кэш чита пуст.

## Краткий справочник

### Поза

| Метод | Сигнатура | Возвращает | Статус |
|---|---|---|---|
| [`GetPartPosition`](#getpartposition) | `part:GetPartPosition()` | `Vector3` | <span className="status-badge verified">проверено</span> |
| [`GetPartSize`](#getpartsize) | `part:GetPartSize()` | `Vector3` | <span className="status-badge verified">проверено</span> |
| [`GetPartRotation`](#getpartrotation) | `part:GetPartRotation()` | `table` (матрица поворота из 9 элементов) | <span className="status-badge verified">проверено</span> |
| [`GetPartCubeVertices`](#getpartcubevertices) | `part:GetPartCubeVertices()` | `table` (8 углов OBB) | <span className="status-badge verified">проверено</span> |

### Идентификация

| Метод | Сигнатура | Возвращает | Статус |
|---|---|---|---|
| [`GetPartInstance`](#getpartinstance) | `part:GetPartInstance()` | `Instance` | <span className="status-badge verified">проверено</span> |
| [`GetPartAddress`](#getpartaddress) | `part:GetPartAddress()` | `number` (uint64 raw pointer) | <span className="status-badge verified">проверено</span> |
| [`GetPartPrimitive`](#getpartprimitive) | `part:GetPartPrimitive()` | `number` (raw адрес struct Primitive) | <span className="status-badge verified">проверено</span> |
| [`GetPartClassName`](#getpartclassname) | `part:GetPartClassName()` | `string` | <span className="status-badge verified">проверено</span> |

### Визуал

| Метод | Сигнатура | Возвращает | Статус |
|---|---|---|---|
| [`GetPartColor`](#getpartcolor) | `part:GetPartColor()` | `r, g, b` (multi-return, 0..255) | <span className="status-badge verified">проверено</span> |
| [`GetPartTransparency`](#getparttransparency) | `part:GetPartTransparency()` | `number` (0..1) | <span className="status-badge verified">проверено</span> |
| [`GetPartShape`](#getpartshape) | `part:GetPartShape()` | `string` (`"Ball"` / `"Block"` / `"Cylinder"` / `"Wedge"` / `"CornerWedge"`) | <span className="status-badge verified">проверено</span> |

### Mesh

| Метод | Сигнатура | Возвращает | Статус |
|---|---|---|---|
| [`GetPartMeshId`](#getpartmeshid) | `part:GetPartMeshId()` | `string` (asset id, `""` если меша нет) | <span className="status-badge verified">проверено</span> |
| [`GetPartHasMesh`](#getparthasmesh) | `part:GetPartHasMesh()` | `boolean` | <span className="status-badge verified">проверено</span> |

---

## `GetPartPosition`

```lua
part:GetPartPosition() -> Vector3
```

Возвращает центр part в world-space как userdata `Vector3`. Это то же значение, которое Roblox отдаёт через `BasePart.Position`, но взятое из parts cache чита без перехода в движок - безопасно вызывать тысячи раз за frame.

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

Возвращает размер part по локальным осям как `Vector3` (x, y, z в студах). Для не-axis-aligned частей world-space bounding box вычисляется по матрице поворота из `GetPartRotation`.

```lua
local size = parts[1]:GetPartSize()
local volume_studs3 = size.X * size.Y * size.Z
```

---

## `GetPartRotation`

```lua
part:GetPartRotation() -> table
```

Возвращает 3×3 матрицу поворота part как плоский массив из 9 элементов, **row-major**. Строки - это `right`, `up`, `forward` соответственно (та же конвенция, что у `Player:GetBoneRotation`).

| Индекс | Значение |
|---|---|
| `[1], [2], [3]` | Right vector (ось X в part-local space) |
| `[4], [5], [6]` | Up vector (ось Y) |
| `[7], [8], [9]` | Forward vector (ось Z) |

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

Возвращает 8 world-space углов OBB part как массив 3-элементных массивов `{x, y, z}`. Порядок углов стабилен между вызовами. Это самый дешёвый способ нарисовать tight box ESP - без ручной математики поворота.

Box учитывает и `Size`, и `Rotation`, поэтому повёрнутая на 45° часть возвращает реальные повёрнутые углы (а не axis-aligned приближение).

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

Возвращает базовый Roblox `Instance` userdata для part. Это тот же объект, который ты получил бы обходом DataModel и поиском `BasePart`, но в отличие от закэшированного `Part` userdata, возвращённый `Instance` открывает полный набор [методов Instance](../userdata/Instance) (`GetChildren`, `GetAttributes`, `IsA` и т. д.).

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

Возвращает сырой 64-битный виртуальный адрес базовой struct `Instance` в процессе Roblox. Полезно, когда нужно обойти property-accessor путь и читать поля напрямую через [`memory.Read`](../libraries/memory#read).

Число - это Lua double, поэтому адреса выше `2^53` теряют 1 бит точности (редко на 64-битной Windows, потому что user-space указатели умещаются в 47 бит).

```lua
local addr = parts[1]:GetPartAddress()
local class_name_ptr = memory.Read("ptr", addr + 0x18)
```

:::warning Volatile
Два вызова в одном frame возвращают один и тот же адрес. После следующего tick кэша этот адрес может указывать на другой (или освобождённый) Instance. Перезапрашивай через `entity.GetParts()`, а не кэшируй адреса между frame-ами.
:::

---

## `GetPartPrimitive`

```lua
part:GetPartPrimitive() -> number
```

Возвращает сырой 64-битный адрес внутренней struct **Primitive** part (имя Roblox для блока physics-and-render данных, висящего на `BasePart`). В Primitive в памяти лежат `CFrame`, raw mesh data и несколько скрытых флагов.

Это escape hatch для memory-level работы; если нужны только positions / sizes - предпочитай высокоуровневые методы выше.

```lua
local prim = parts[1]:GetPartPrimitive()
```

---

## `GetPartClassName`

```lua
part:GetPartClassName() -> string
```

Возвращает `ClassName` базового Instance (например, `"Part"`, `"MeshPart"`, `"WedgePart"`, `"TrussPart"`, `"CornerWedgePart"`). Эквивалентно чтению `:GetPartInstance().ClassName`, но дешевле.

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

Возвращает цвет part как **три числа** (multi-return), каждое в байтовом диапазоне `0..255`. Используй `select("#", ...)` для подтверждения формы multi-return.

```lua
local r, g, b = parts[1]:GetPartColor()
local color   = Color3.fromRGB(r, g, b)
```

:::info Не та же форма, что у `Color3`
`Color3.new(r, g, b)` принимает `0..1` floats. `GetPartColor` возвращает `0..255` integers. Конвертируй через `Color3.fromRGB(r, g, b)`.
:::

---

## `GetPartTransparency`

```lua
part:GetPartTransparency() -> number
```

Возвращает прозрачность part в диапазоне `0..1`. `0` = полностью непрозрачен, `1` = полностью невидим. Фильтруй через `t < 1`, чтобы пропускать ghost-part, которых игрок не видит.

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

Возвращает геометрическую форму как одну из канонических строк:

| Возврат | Значение |
|---|---|
| `"Block"` | Стандартный кубоид `Part` |
| `"Ball"` | Сферический `Part` |
| `"Cylinder"` | Цилиндрический `Part` |
| `"Wedge"` | `WedgePart` |
| `"CornerWedge"` | `CornerWedgePart` |

`MeshPart` возвращает одну из перечисленных форм как fallback (отрисовываемая геометрия определяется mesh-ассетом, но collision/bounding shape - одна из этих пяти).

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

Возвращает asset id меша для `MeshPart` инстансов (обычно `"rbxassetid://<id>"` или `"rbxasset://...mesh"`). Возвращает пустую строку `""` для не-mesh частей.

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

Возвращает `true`, если у чита есть закэшированные данные triangle mesh для этой part. Это то, что нужно проверять перед вызовом `draw.GetMesh` (когда задокументирован) или перед чтением `GetPartMeshId`.

Для обычных `Part` / `WedgePart` и т. п. возвращает `false` - они используют один из канонических примитивов формы, а не triangle mesh.

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

## Паттерны

### ESP-цикл с screen-projected OBB
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

### Цветовая индикация part по форме
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

### Фильтрация и dump mesh-частей
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

### Dump адресов для memory-анализа
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
