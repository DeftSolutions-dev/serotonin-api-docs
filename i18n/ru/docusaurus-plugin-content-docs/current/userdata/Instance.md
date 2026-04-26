---
sidebar_position: 1
title: Instance
---

# `Instance`

Методы и свойства Roblox `Instance` userdata, возвращаемых [`game.Workspace`](../libraries/game), [`:FindFirstChild`](#findfirstchild) и остальными tree-walk аксессорами. `Instance` userdata - это мост чита к живой Roblox DataModel: каждое чтение свойства пересекает границу адресного пространства игры, а каждый вызов метода маршрутизируется через safe-accessor слой Serotonin.

| | |
|---|---|
| **Методы** | 18 |
| **Свойства (проверенные)** | 38 (зависит от базового Roblox-класса) |
| **Проверено вживую** | Все 18 методов присутствуют, поведение проверено на `game.Workspace` и `Camera` |
| **Требуемый event** | нет |
| **Сайд-эффекты** | `SetAttribute`, `SetHighlightOnTop`, `SetHighlightTransparency`, `Destroy` мутируют состояние |

> **Именование.** Все методы используют PascalCase, повторяя Roblox API. Свойства case-sensitive и привязаны только перечисленные имена - обращение к `instance.position` (строчная буква) возвращает `nil`, а не значение `Position`.

> **Полиморфная таблица свойств.** Разные Roblox-классы выставляют разные свойства. У `Camera` есть `FieldOfView`/`Fov`/`LookVector`; у `Part` - `Position`/`Size`/`Color`; у `StringValue` - `Value`. Чтение свойства, которого нет на базовом классе, возвращает `nil` без ошибки.

## Краткий справочник

### Обход дерева

| Метод | Сигнатура | Возвращает | Статус |
|---|---|---|---|
| [`GetChildren`](#getchildren) | `instance:GetChildren()` | `table` прямых потомков | <span className="status-badge verified">проверено</span> |
| [`GetDescendants`](#getdescendants) | `instance:GetDescendants()` | `table` всех descendants | <span className="status-badge verified">проверено</span> |
| [`FindFirstChild`](#findfirstchild) | `instance:FindFirstChild(name)` | `Instance` или ничего | <span className="status-badge verified">проверено</span> |
| [`FindFirstChildOfClass`](#findfirstchildofclass) | `instance:FindFirstChildOfClass(className)` | `Instance` или ничего | <span className="status-badge verified">проверено</span> |
| [`FindFirstAncestor`](#findfirstancestor) | `instance:FindFirstAncestor(name)` | `Instance` или ничего | <span className="status-badge verified">проверено</span> |
| [`FindFirstAncestorOfClass`](#findfirstancestorofclass) | `instance:FindFirstAncestorOfClass(className)` | `Instance` или ничего | <span className="status-badge verified">проверено</span> |
| [`FindFirstDescendant`](#findfirstdescendant) | `instance:FindFirstDescendant(name)` | `Instance` или ничего | <span className="status-badge verified">проверено</span> |
| [`FindFirstDescendantOfClass`](#findfirstdescendantofclass) | `instance:FindFirstDescendantOfClass(className)` | `Instance` или ничего | <span className="status-badge verified">проверено</span> |

### Проверки типа / иерархии

| Метод | Сигнатура | Возвращает | Статус |
|---|---|---|---|
| [`IsA`](#isa) | `instance:IsA(className)` | `boolean` (равенство ClassName, не наследование) | <span className="status-badge verified">проверено</span> |
| [`IsDescendantOf`](#isdescendantof) | `instance:IsDescendantOf(ancestor)` | `boolean` | <span className="status-badge verified">проверено</span> |
| [`IsAncestorOf`](#isancestorof) | `instance:IsAncestorOf(descendant)` | `boolean` | <span className="status-badge verified">проверено</span> |

### Атрибуты

| Метод | Сигнатура | Возвращает | Статус |
|---|---|---|---|
| [`GetAttributes`](#getattributes) | `instance:GetAttributes()` | массив `{ Name, Value, TypeName }` | <span className="status-badge verified">проверено</span> |
| [`GetAttribute`](#getattribute) | `instance:GetAttribute(name)` | `any` или `nil` | <span className="status-badge verified">проверено</span> |
| [`GetFirstAttributeOfType`](#getfirstattributeoftype) | `instance:GetFirstAttributeOfType(typeName)` | `any` | <span className="status-badge verified">проверено</span> |
| [`SetAttribute`](#setattribute) | `instance:SetAttribute(name, value)` | ничего | <span className="status-badge verified">проверено</span> |

### Визуал / lifecycle

| Метод | Сигнатура | Возвращает | Статус |
|---|---|---|---|
| [`SetHighlightOnTop`](#sethighlightontop) | `instance:SetHighlightOnTop()` | ничего | <span className="status-badge verified">проверено</span> |
| [`SetHighlightTransparency`](#sethighlighttransparency) | `instance:SetHighlightTransparency(value)` | ничего | <span className="status-badge verified">проверено</span> |
| [`Destroy`](#destroy) | `instance:Destroy()` | ничего | <span className="status-badge verified">проверено</span> |

---

## `GetChildren`

```lua
instance:GetChildren() -> table
```

Возвращает массив прямых потомков instance. Пустая таблица, если потомков нет. Порядок соответствует внутреннему порядку детей в Roblox (обычно - порядок вставки).

Проверено вживую на `game.Workspace`: вернул таблицу из 1082 элементов на заполненном Roblox-плейсе. Каждый элемент - свежий `Instance` userdata.

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

Возвращает плоский массив всех descendants в поддереве (дети, внуки, ...). Порядок - depth-first. Используй когда нужно перечислить всё поддерево разом. Для поиска одного объекта [`FindFirstDescendant`](#findfirstdescendant) дешевле и **рекурсивно** обходит всё поддерево (проверено вживую: `ws:FindFirstDescendant("Camera")` возвращает Camera, хотя Camera - прямой потомок).

:::warning Стоимость
На заполненном Workspace `GetDescendants` возвращает десятки тысяч элементов. Кэшируй результат вместо вызова каждый frame.
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

Возвращает первого **прямого** потомка чьё `Name` совпадает с `name`. Ищет только на один уровень.

Проверенная форма аргумента:

| Вызов | Результат |
|---|---|
| `ws:FindFirstChild("Camera")` | `Instance` userdata |
| `ws:FindFirstChild("zzz_not_real")` | ничего (нет возвращаемого значения, `nil` в выражениях) |
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

Возвращает первого прямого потомка чьё `ClassName` равно `className`. Как и `IsA`, это **строгое равенство ClassName** - `FindFirstChildOfClass("BasePart")` не найдёт `Part`.

Проверено вживую: `ws:FindFirstChildOfClass("Camera")` вернул userdata Camera из workspace.

```lua
local cam = game.Workspace:FindFirstChildOfClass("Camera")
if cam then print("FOV (rad):", cam.FieldOfView) end
```

---

## `FindFirstAncestor`

```lua
instance:FindFirstAncestor(name: string) -> Instance
```

Идёт вверх по цепочке `.Parent` и возвращает первого предка чьё `Name` совпадает с `name`. Возвращает ничего если такого предка нет.

Полезно когда у тебя глубокий descendant (шапка, accessory модели оружия) и нужна его родительская character / model:

```lua
local rootpart = part:FindFirstAncestor("HumanoidRootPart")
```

---

## `FindFirstAncestorOfClass`

```lua
instance:FindFirstAncestorOfClass(className: string) -> Instance
```

Идёт вверх по цепочке `.Parent` и возвращает первого предка чьё `ClassName` равно `className`.

```lua
local model = inst:FindFirstAncestorOfClass("Model")
```

---

## `FindFirstDescendant`

```lua
instance:FindFirstDescendant(name: string) -> Instance
```

Возвращает первого descendant с указанным `Name`, **рекурсивно** обходя всё поддерево (проверено вживую: `ws:FindFirstDescendant("Camera")` возвращает Camera, `part:FindFirstDescendant("Foo")` возвращает ничего, когда такого descendant нет). Точный порядок обхода implementation-defined; считай это "любой descendant с этим именем".

:::info Когда лучше использовать `GetDescendants`
Если скрипту нужен предсказуемый порядок или нужно матчить по нескольким критериям (Name + ClassName + значение атрибута), итерируй `GetDescendants()` сам.
:::

---

## `FindFirstDescendantOfClass`

```lua
instance:FindFirstDescendantOfClass(className: string) -> Instance
```

То же что `FindFirstDescendant`, но матчит по `ClassName`. Строгое равенство (без обхода наследования - как у [`IsA`](#isa)). Проверено вживую: `ws:FindFirstDescendantOfClass("Camera")` возвращает workspace Camera.

---

## `IsA`

```lua
instance:IsA(className: string) -> boolean
```

:::danger Не учитывает наследование
`IsA` в этом runtime **НЕ** ходит по иерархии классов Roblox. Он сравнивает `instance.ClassName` со строкой-аргументом прямой проверкой на равенство.
:::

Проверено вживую на `game.Workspace`:

| Вызов | Результат |
|---|---|
| `ws:IsA("Workspace")` | `true` |
| `ws:IsA("Instance")` | `false` (Workspace наследует от Instance в реальном Roblox, но этот `IsA` это игнорирует) |
| `ws:IsA("Part")` | `false` |

Если нужно матчить "любой part", сверяй `ClassName` с известным набором конкретных классов:

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

Возвращает `true` если `instance` находится где-либо в поддереве `ancestor`.

```lua
local cam = game.Workspace:FindFirstChildOfClass("Camera")
print(cam:IsDescendantOf(game.Workspace))   -- true
```

---

## `IsAncestorOf`

```lua
instance:IsAncestorOf(descendant: Instance) -> boolean
```

Обратное к `IsDescendantOf`. Возвращает `true` если `descendant` находится где-либо в поддереве `instance`.

---

## `GetAttributes` / `GetAttribute` / `SetAttribute` / `GetFirstAttributeOfType`

```lua
instance:GetAttributes() -> table
instance:GetAttribute(name: string) -> table | nil
instance:GetFirstAttributeOfType(typeName: string) -> table | nil
instance:SetAttribute(name: string, value: any) -> nothing
```

:::info Чтение работает, запись не персистится
Перепроверено вживую в билде `version-390ba09e7e944154`:

- **`GetAttributes()` и `GetAttribute(name)` работают** для атрибутов которые уже населил Roblox-engine или place-script. Проверено: `game.Workspace:GetAttribute("RbxLegacyAnimationBlending")` возвращает `{Value=true, Name="RbxLegacyAnimationBlending", TypeName="bool"}`.
- **`SetAttribute(name, value)` проходит без ошибки, но не персистится.** Проверено через `number`, `string`, `bool`, `Vector3` и immediate + one-frame-deferred `GetAttribute` чтения - каждый Set-вызов молча терялся, каждый следующий `GetAttribute` возвращал `nil`, а `GetAttributes()` продолжал возвращать то же что и до.

То есть этот API эффективно **read-only** в этом билде. Используй его для чтения значений установленных place / engine; не полагайся на него для cross-script state. Для своего state используй `cheat.Register` event-scoped переменные, file IO, или `ui.GetValue` / `ui.SetValue` widget round-trip.
:::

### `GetAttribute(name)` возвращает record, не raw-значение

В отличие от стандартного Roblox-API, где `instance:GetAttribute(name)` возвращает значение напрямую, этот runtime возвращает **3-key record-таблицу** с той же формой что одна запись `GetAttributes()`:

```lua
{ Name = string, Value = any, TypeName = string }
```

Проверено:

| Вызов | Результат |
|---|---|
| `ws:GetAttribute("RbxLegacyAnimationBlending")` | `{ Name = "RbxLegacyAnimationBlending", Value = true, TypeName = "bool" }` |
| `ws:GetAttribute("InsertPoint")` (не установлен) | `nil` |
| `ws:GetAttribute("Retargeting")` (не установлен) | `nil` |
| `ws:GetAttribute("AnimationWeightedBlendFix")` (не установлен) | `nil` |

Читай value через `.Value`:

```lua
local rec = game.Workspace:GetAttribute("RbxLegacyAnimationBlending")
if rec then
    print("blend mode:", rec.Value, "type:", rec.TypeName)
end
```

### `GetAttributes()` возвращает массив записей

Итерируй через `ipairs`, не `pairs` - результат это массив, не name-keyed map. Каждая запись имеет ту же форму что возврат `GetAttribute`.

Проверено вживую: `game.Workspace:GetAttributes()` вернул `{ [1] = { Name = "RbxLegacyAnimationBlending", Value = true, TypeName = "bool" } }`. `TypeName` следует таксономии атрибутов Roblox: `"bool"`, `"string"`, `"number"`, `"Vector3"`, `"Color3"`, `"UDim2"`, `"BrickColor"` и т.д.

```lua
for _, attr in ipairs(game.Workspace:GetAttributes()) do
    print(attr.Name, attr.TypeName, attr.Value)
end
```

### `GetFirstAttributeOfType(typeName)`

Возвращает первую запись атрибута чей `TypeName` совпадает с аргументом, или `nil` когда совпадений нет. Та же форма что у `GetAttribute`.

### `SetAttribute(name, value)` - нерабочий в этом билде

Вызов принимает `name: string` плюс `value` любого из стандартных типов атрибутов (`bool`, `number`, `string`, `Vector3`, `Color3`, ...) и ничего не возвращает. **Молчаливо no-op'ится**: значение не сохраняется, а следующий `GetAttribute(name)` возвращает `nil`.

| Вызов | Проверенный результат |
|---|---|
| `part:SetAttribute("Key", 42)`            | проходит, без ошибки, значение не сохранено |
| `part:SetAttribute("Key", "abc")`         | проходит, не сохранено |
| `part:SetAttribute("Key", true)`          | проходит, не сохранено |
| `part:SetAttribute("Key", Vector3.new(1, 2, 3))` | проходит, не сохранено |
| `instance:SetAttribute("Foo", nil)`       | error: `"bad argument #3 to '?' (unsupported type for attribute value)"` (нельзя очистить через `nil`) |

---

## `SetHighlightOnTop`

```lua
instance:SetHighlightOnTop() -> nothing
```

Для instance класса `Highlight` переключает highlight в режим рендеринга поверх всего (игнорируя глубину). No-op для других классов instance.

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

Задаёт `FillTransparency` highlight. Диапазон значения `0..1` (0 = полностью непрозрачная заливка, 1 = полностью прозрачная заливка).

---

## `Destroy`

```lua
instance:Destroy() -> nothing
```

Уничтожает instance (parents в `nil`, блокирует объект). Стандартная семантика Roblox.

:::warning Сайд-эффект на живой игре
Это реально удаляет instance из дерева Roblox-игры. Не вызывай на `Workspace`, `Players` или любом сервисе - это может крашнуть клиент.
:::

---

## Свойства

Чтение свойства возвращает `nil` если базовый класс не выставляет это поле. Чит выставляет объединение полей по всем распространённым Roblox-классам.

| Имя | Тип | Описание |
|---|---|---|
| `Name` | `string` | Имя instance. Проверено `"Workspace"` на `game.Workspace`. |
| `ClassName` | `string` | Имя класса instance. Проверено `"Workspace"` на `game.Workspace`. |
| `Parent` | `Instance` | Родитель в иерархии (`Workspace.Parent` это userdata DataModel). |
| `Address` | `number` | Младшие 32 бита C++ указателя instance. Проверено `488443520` на `game.Workspace` в одном запуске. |
| `Character` | `Instance` | Модель персонажа Player. |
| `Position` | `Vector3` | 3D-позиция Part. |
| `Size` | `Vector3` | Размер Part. |
| `Velocity` | `Vector3` | Скорость Part. |
| `Rotation` | `Vector3` | Поворот Part (Euler XYZ в градусах). |
| `Color` | `Color3` | Color3 значение Part. |
| `Material` | `string` | Материал Part. |
| `Transparency` | `number` | Прозрачность Part (0-1). |
| `Reflectance` | `number` | Reflectance Part (0-1). |
| `CanCollide` | `boolean` | Может ли Part участвовать в коллизиях. |
| `Health` | `number` | Текущее здоровье Humanoid. |
| `MaxHealth` | `number` | Максимальное здоровье Humanoid. |
| `MoveDirection` | `Vector3` | Направление движения Humanoid. |
| `MeshId` | `string` | ID меш-ассета MeshPart. |
| `TextureId` | `string` | ID текстурного ассета. |
| `SoundId` | `string` | ID звукового ассета. |
| `LookVector` | `Vector3` | Направление взгляда Camera (forward-ось CFrame). Проверено userdata на `Camera`. |
| `RightVector` | `Vector3` | Right-направление Camera. Проверено userdata на `Camera`. |
| `UpVector` | `Vector3` | Up-направление Camera. Проверено userdata на `Camera`. |
| `Fov` / `FieldOfView` | `number` | Поле зрения Camera **в радианах**. Проверено `1.2217305898666` (= 70°) на `Camera`. Оба имени - алиасы одного поля. |
| `CameraSubject` | `Instance` | Subject камеры. |
| `FillColor` | `Color3` | Цвет заливки Highlight. |
| `OutlineColor` | `Color3` | Цвет контура Highlight. |
| `FillTransparency` | `number` | Прозрачность заливки Highlight. |
| `DepthMode` | `number` | Depth mode Highlight. |
| `Value` | `any` | Значение объекта ValueBase. |
| `StringValue` | `string` | Значение StringValue instance. |
| `NumberValue` | `number` | Значение NumberValue instance. |
| `IntValue` | `number` | Значение IntValue instance. |
| `BoolValue` | `boolean` | Значение BoolValue instance. |
| `ObjectValue` | `Instance` | Значение ObjectValue instance. |
| `TextLabelValue` | `string` | Текстовое содержимое TextLabel. |
| `TextColor3` | `Color3` | Цвет текста TextLabel. |

:::warning Нет свойства `CFrame`
Проверено вживую: `cam.CFrame` вернул `nil` на реальном Camera. Чит выставляет компоненты CFrame (`LookVector`, `RightVector`, `UpVector`, `Position`), но **не** саму CFrame. Чтобы реконструировать ориентацию используй три направляющих вектора плюс `Position`.
:::

---

## Паттерны

### Walk children с фильтром по классу
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

### Прочитать все атрибуты с модели
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

### Найти глубокий descendant
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

### Подсветить все parts в модели
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
