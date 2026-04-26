---
sidebar_position: 3
title: Player
---

# `Player`

Методы и свойства player-объектов, возвращаемых [`entity.GetPlayers()`](../libraries/entity#getplayers), [`entity.GetLocalPlayer()`](../libraries/entity#getlocalplayer) и [`entity.GetTarget()`](../libraries/entity#gettarget). Userdata `Player` - это пред-кэшированная проекция читом Roblox-объекта `Player` плюс его `Character` rig: каждое свойство и позиция кости уже извлечены из движка, так что чтения - это pointer chases (дёшево), а не RPC.

| | |
|---|---|
| **Методы** | 4 (`GetBonePosition`, `GetBoneInstance`, `GetBoneSize`, `GetBoneRotation`) |
| **Свойства** | 15 |
| **Проверено вживую** | 4 из 4 методов, 15 из 15 свойств (проверено на R15 enemy character `n_nonoy2`, build `version-390ba09e7e944154`) |
| **Требуемый event-контекст** | нет |
| **Побочные эффекты** | нет - read-only userdata |

> **Синтаксис вызова методов.** Используй `:` для методов (`player:GetBonePosition("Head")`), `.` для свойств (`player.Health`).

> **Время жизни кэша.** Как и `Part`, userdata `Player` безопасен для использования только в пределах одного frame'а. Перетягивай через `entity.GetPlayers()` каждый tick, а не храни ссылки между кадрами.

> **Bones зависят от загруженного character'а.** Проверено вживую в Studio-like сцене где `entity.GetLocalPlayer()` вернул игрока, но character не был полностью загружен в bone-cache чита: `GetBoneRotation("HumanoidRootPart")` вернул `{0, 0, 0, 0, 0, 0, 0, 0, 0}`, `GetBonePosition`/`GetBoneSize` вернули zero-filled `Vector3` userdata. **Всегда проверяй `:GetBoneInstance(name) ~= nil` перед тем как доверять остальным трём bone-методам.** Это верно даже для `LocalPlayer` между respawn'ами / на загрузке карты.

> **TeamColor - это не настоящий `Color3`.** Это отдельный userdata-тип. Его аксессоры `.R/.G/.B` возвращают байтовые значения `0..255` (не `0..1` floats как у `Color3`), а `tostring` печатает 16-битные каналы `0..65535`. Чтобы сконвертировать его в renderable `Color3`, используй `Color3.fromRGB(p.TeamColor.R, p.TeamColor.G, p.TeamColor.B)`.

## Краткий справочник

### Методы

| Метод | Сигнатура | Возвращает | Статус |
|---|---|---|---|
| [`GetBonePosition`](#getboneposition) | `player:GetBonePosition(boneName)` | `Vector3` (zero-filled, если кость отсутствует) | <span className="status-badge verified">проверено</span> |
| [`GetBoneInstance`](#getboneinstance) | `player:GetBoneInstance(boneName)` | `Instance` или `nil` (`nil` = кость отсутствует) | <span className="status-badge verified">проверено</span> |
| [`GetBoneSize`](#getbonesize) | `player:GetBoneSize(boneName)` | `Vector3` (zero-filled, если кость отсутствует) | <span className="status-badge verified">проверено</span> |
| [`GetBoneRotation`](#getbonerotation) | `player:GetBoneRotation(boneName)` | `table` (матрица из 9 элементов, all-zero, если кость отсутствует) | <span className="status-badge verified">проверено</span> |

### Свойства

| Имя | Тип | Описание |
|---|---|---|
| `Name` | `string` | Roblox username (например, `"n_nonoy2"`). |
| `DisplayName` | `string` | Roblox display name (например, `"Frank"`). |
| `UserId` | `number` | Roblox user ID. |
| `Team` | `string` | Имя команды (например, `"Enemy"`, `"Cowboys"`). Пустая строка, если нейтральный. |
| `Weapon` | `string` | Имя модели экипированного оружия (например, `"PrimaryDisplay"`, `"PistolDisplay"`). Пустая строка, если безоружен. |
| `Position` | `Vector3` | Позиция root part. Может отставать на 1 frame; для актуального значения предпочитай `GetBonePosition("HumanoidRootPart")`. |
| `Velocity` | `Vector3` | Линейная скорость root part. |
| `Health` | `number` | Текущее здоровье. |
| `MaxHealth` | `number` | Максимальное здоровье (для нормализации HP-бара). |
| `IsAlive` | `boolean` | `true`, пока humanoid жив. |
| `IsVisible` | `boolean` | `true`, если проходит проверка видимости чита (raycast от локальной камеры до груди игрока). |
| `IsEnemy` | `boolean` | `true`, если чит классифицирует игрока как врага локального игрока. Game-specific логика - режимы TDM/CTF/FFA на это влияют. |
| `IsWhitelisted` | `boolean` | `true`, если игрок находится в whitelist чита (задаётся через [`game.PlayerWhitelist`](../libraries/game#playerwhitelist)). |
| `TeamColor` | `userdata` | Значение цвета команды с аксессорами `.R/.G/.B` (0..255). НЕ `Color3` - см. предупреждение выше. |
| `BoundingBox` | `table` | Экранный bounding rectangle как целочисленные `{ x, y, w, h }`. `{ x = 0, y = 0, w = 0, h = 0 }`, когда вне экрана. |

### Имена костей R15

Проверено вживую: эти имена костей резолвятся в реальный `Instance` userdata, когда игрок жив на R15 rig'е:

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

Legacy R6-имя `Torso` **не** является костью на R15 rig'ах - `GetBoneInstance("Torso")` возвращает `nil`. Используй вместо этого `UpperTorso` (область груди) или `LowerTorso` (пояс). Безопасный fallback-паттерн см. в [`GetBoneInstance`](#getboneinstance).

---

## `GetBonePosition`

```lua
player:GetBonePosition(boneName: string) -> Vector3
```

Возвращает центр кости в world space как `Vector3`. **Всегда возвращает `Vector3` userdata**, даже когда названной кости не существует - в этом случае все компоненты равны нулю.

Проверка на R15-персонаже:

| Вызов | Результат |
|---|---|
| `target:GetBonePosition("Head")` | `Vector3` userdata, реальные координаты |
| `target:GetBonePosition("HumanoidRootPart")` | `Vector3` userdata, реальные координаты |
| `target:GetBonePosition("Torso")` (нет на R15) | `Vector3` userdata, all-zero (`(0, 0, 0)`) |
| `target:GetBonePosition("garbage_name")` | `Vector3` userdata, all-zero |

Поскольку нулевые позиции возвращаются молча, **никогда не используй `GetBonePosition` сам по себе как проверку существования.** Используй [`GetBoneInstance`](#getboneinstance) (возвращает `nil` для отсутствующих костей) или проверяй магнитуду:

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

Возвращает Roblox `Instance` для названной кости, или `nil`, если такой кости нет на rig'е. **Единственная надёжная проверка существования** из четырёх методов работы с костями.

Используй это, когда хочешь сделать fallback на другое имя кости на rig'ах, где запрошенной нет (например, R15 vs R6 character models):

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

Возвращаемый `Instance` предоставляет полный набор [методов Instance](../userdata/Instance) (`GetChildren`, `GetAttributes`, `IsA` и т.д.) и свойств (`Position`, `Size`, `CFrame`-style `LookVector` и т.д.) лежащего под ним `BasePart`.

---

## `GetBoneSize`

```lua
player:GetBoneSize(boneName: string) -> Vector3
```

Возвращает bounding-box size кости как `Vector3` (x, y, z, каждое в studs). Как и `GetBonePosition`, для отсутствующих костей возвращает zero-filled `Vector3`, а не `nil`.

Полезно для пропорционального ESP - head-кружок, радиус которого масштабируется с размером кости:

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

Возвращает 3×3 world-space rotation matrix кости как плоский массив из 9 элементов, **row-major** (строки - `right`, `up`, `forward`).

Пример реального возврата на R15 `HumanoidRootPart` (игрок повёрнут примерно в +X +Z):
```
{ -0.6306, 0,      0.7761,
   0,      1.0000, 0,
  -0.7761, 0,      -0.6306 }
```

Для отсутствующих костей таблица - все нули, тот же caveat что и у `GetBonePosition`. Детектируй через детерминант или через precheck-вызов `GetBoneInstance`.

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

## Паттерны

### Enemy ESP с HP-барами
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

### Aim-assist target picker (ближайшая к crosshair голова)
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

### Разделение team / enemy с учётом team-color
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

### Bone fallback для R15 vs R6
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
