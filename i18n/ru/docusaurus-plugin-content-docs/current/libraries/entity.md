---
sidebar_position: 3
title: entity
---

# `entity`

Кешированный snapshot всех игроков, плюс bone-аксессоры для хитбоксов, реестр кастомных моделей и query текущей aim-цели. Самый быстрый путь к per-player данным, чит держит этот кеш в актуальном состоянии за тебя, не нужно платить за прогулку по `game.Players` руками.

| | |
|---|---|
| **Функций** | 9 (27 с алиасами) |
| **Проверено вживую** | 5 из 9 (4 функции реестра моделей задокументированы из dump, не выполнены) |
| **Требуемый event** | нет |
| **Сайд-эффекты** | `AddModel`, `EditModel`, `RemoveModel`, `ClearModels` мутируют реестр кастомных entity чита |

> **Алиасы.** Три формы у каждой: `entity.GetPlayers` / `getPlayers` / `get_players`. См. [Обзор / Конвенция именования](../overview#конвенция-именования).

## Краткий справочник

| Функция | Сигнатура | Заметка | Статус |
|---|---|---|---|
| [`GetPlayers`](#getplayers)         | `([onlyEnemies: bool]) → table { [1..n] = player }` | массив player userdata, основной запрос | <span className="status-badge verified">проверено</span> |
| [`GetLocalPlayer`](#getlocalplayer) | `() → player`                                       | локальный пользователь как player userdata        | <span className="status-badge verified">проверено</span> |
| [`GetTarget`](#gettarget)           | `() → player \| nil`                                | текущий aim-target или nil                        | <span className="status-badge verified">проверено</span> |
| [`GetParts`](#getparts)             | `() → table { [1..n] = idx }`                       | кешированные part-индексы, часто пустой          | <span className="status-badge verified">проверено</span> |
| [`GetPartsCount`](#getpartscount)   | `() → int`                                          | длина `GetParts()` без аллокации table           | <span className="status-badge verified">проверено</span> |
| [`AddModel`](#addmodel)             | `(key: string, data: table)`                        | внедрить кастомную entity в кеш                   | <span className="status-badge partial">частично</span> |
| [`EditModel`](#editmodel)           | `(key: string, data: table)`                        | мутировать поля зарегистрированной entity         | <span className="status-badge partial">частично</span> |
| [`RemoveModel`](#removemodel)       | `(key: string)`                                     | удалить зарегистрированную кастомную entity       | <span className="status-badge partial">частично</span> |
| [`ClearModels`](#clearmodels)       | `()`                                                | удалить все кастомные entity сразу                | <span className="status-badge partial">частично</span> |

## Player userdata

Каждое значение возвращаемое `GetPlayers`, `GetLocalPlayer` и `GetTarget` это **player userdata** с фиксированным набором read-only полей и 4 методами доступа к bones. Проверено вживую в The Wild West с 29 активными игроками в лобби.

### Поля

Доступ через dot syntax: `p.Name`, `p.Health` и т.д.

| Поле | Тип | Проверенный пример | Заметка |
|---|---|---|---|
| `Name`          | `string`           | `"xXSkyXx12345"`               | Roblox username |
| `DisplayName`   | `string`           | `"G59_chris"`                  | display name установленное юзером |
| `UserId`        | `number`           | `59135288`                     | Roblox UserId, постоянный при rename |
| `Team`          | `string`           | `"Cowboys"`, `"Outlaws"`, `"Enemy"` | имя команды. НЕ Instance, просто строка |
| `TeamColor`     | `userdata`         | `tostring` даёт `"49980, 10200, 7140"`, `.R/.G/.B` дают `196, 40, 28` | аксессоры `.R/.G/.B` возвращают **байты 0..255** (НЕ 0..1 float'ы как Roblox `Color3`). Форма `tostring` в 16-bit scale (0..65535). См. ниже. |
| `Weapon`        | `string`           | `"PrimaryDisplay"`             | идентификатор текущего оружия, пустая строка если ничего |
| `Position`      | `Vector3`          | часто `(0, 0, 0)`              | **часто stale**, см. warning ниже |
| `Velocity`      | `Vector3`          | `(0, 0, 0)` когда стоит, unit-length направление (например `(-0.76, 0, -0.65)` с `Magnitude == 1`) когда движется | нормализованное направление ходьбы, НЕ raw физическая скорость. Всегда `(0,0,0)` для idle игроков |
| `Health`        | `number`           | `71`                           | текущий HP |
| `MaxHealth`     | `number`           | `100`                          | макс HP |
| `IsAlive`       | `bool`             | `true`                         | проверка ragdoll / spawned |
| `IsEnemy`       | `bool`             | `true`                         | true если на противоположной команде |
| `IsVisible`     | `bool`             | `false`                        | true если не за стеной (см. также `BoundingBox`) |
| `IsWhitelisted` | `bool`             | `false`                        | true если помечен friendly через `game.PlayerWhitelist` |
| `BoundingBox`   | `table {x, y, w, h}` | `{x=1277, y=-2917, w=16, h=66}` | прямоугольник в screen-space пикселях, все нули если off-screen. См. ниже. |

:::warning `Position` часто stale, используй bones
В FFA / vehicle / Western режимах `p.Position` часто `(0, 0, 0)` даже для живых, движущихся игроков. Bone-аксессоры ниже возвращают живую world-позицию каждый кадр:
```lua
local hrp = p:GetBonePosition("HumanoidRootPart")
```
:::

:::info `TeamColor` это Serotonin-кастомное userdata, НЕ Roblox `Color3`
Проверено два формата доступа на одном значении (команда Outlaws):
- `tostring(tc)` → `"49980, 10200, 7140"` (16-bit каналы, 0..65535)
- `tc.R, tc.G, tc.B` → `196, 40, 28` (байты, 0..255)

Используй байтовую форму для повседневной работы, она напрямую матчится в `Color3.fromRGB(r, g, b)`:
```lua
local tc = p.TeamColor
local color = Color3.fromRGB(tc.R, tc.G, tc.B)
```
Заметь что это отличается от стандартного Roblox `Color3.R/.G/.B`, который вернул бы 0..1 float'ы.
:::

:::info `BoundingBox` это готовый ESP-прямоугольник
Проверено: видимый игрок дал `{x=1277, y=-2917, w=16, h=66}` (y отрицательный потому что игрок был выше экрана в этот кадр). Off-screen игроки дают `{0, 0, 0, 0}`. Можно сразу скармливать в `draw.Rect`:
```lua
local bb = p.BoundingBox
if bb.w > 0 then
    draw.Rect(bb.x, bb.y, bb.w, bb.h, Color3.fromRGB(255, 0, 0), 1, 0, 1)
end
```
:::

### Методы

Player userdata имеет 4 bone-аксессора. Имена костей это стандартные Roblox R15 / R6 part names: `HumanoidRootPart`, `Head`, `UpperTorso`, `LowerTorso`, `LeftUpperArm`, `RightUpperArm`, `LeftUpperLeg`, `RightUpperLeg` и т.д.

| Метод | Возврат | Проверенный пример для `HumanoidRootPart` |
|---|---|---|
| `:GetBonePosition(name)`   | `Vector3`        | `(-1253.6, 170.8, -636.5)` |
| `:GetBoneSize(name)`       | `Vector3`        | `(5.0, 5.0, 5.0)` (хитбокс чита, не физический размер part'а) |
| `:GetBoneRotation(name)`   | `table[1..9]`    | flat 3x3 rotation matrix как 9 чисел |
| `:GetBoneInstance(name)`   | `Instance`       | underlying Roblox part как usable Instance handle |

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

Возвращает массив каждого игрока которого чит сейчас отслеживает. С `onlyEnemies = true` массив pre-filtered к игрокам у которых `IsEnemy == true`.

Проверено вживую: полный список вернул 29 entries, `GetPlayers(true)` вернул 8.

```lua
local players = entity.GetPlayers()
print(string.format("отслеживается %d игроков", #players))

local enemies = entity.GetPlayers(true)
for _, p in ipairs(enemies) do
    if p.IsAlive then
        local pos = p:GetBonePosition("HumanoidRootPart")
        print(string.format("  враг %s в (%.1f, %.1f, %.1f) hp=%d",
            p.Name, pos.X, pos.Y, pos.Z, p.Health))
    end
end
```

Возвращаемые `userdata` ссылки остаются валидными пока ты их держишь, но их поля обновляются каждый кадр. Перезывай `GetPlayers()` каждый тик если код может вытерпеть iteration cost, или кешируй userdata и читай свежие поля каждый кадр.

---

## `GetLocalPlayer`

```lua
entity.GetLocalPlayer() → player_userdata
```

Возвращает тот же тип userdata что `GetPlayers()` но для локального юзера. Тот же набор полей.

Проверено вживую (lobby state, ещё не заспавнен):
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

Возвращает player userdata на которого сейчас залочена aim-система чита, или `nil` если ничего не targeted прямо сейчас.

Проверено вживую: вернула `nil` когда aimbot-таргета не было.

Используй для triggerbot-логики без переопределения логики выбора цели:

```lua
cheat.register("onUpdate", function()
    local tgt = entity.GetTarget()
    if tgt and tgt.IsAlive and tgt.IsVisible then
        print("залочились на:", tgt.Name)
    end
end)
```

---

## `GetParts`

```lua
entity.GetParts() → table { [1..n] = part_index }
```

Возвращает кешированный читом список part-индексов для текущей карты. Кеш заполняется играми которые используют ACS-style entity-систему, многие игры оставляют его пустым.

Проверено вживую: вернул пустой table (`#parts == 0`) в Western игре.

```lua
local parts = entity.GetParts()
for i, idx in ipairs(parts) do
    print(string.format("part %d -> idx %s", i, tostring(idx)))
end
```

Текущий билд **не** экспортирует per-part read функции (`getPartPosition` / `getPartSize` / `getPartRotation` / `GetPartAddress` / итд все равны `nil` в `entity` table этого билда). Индексы из этого списка нельзя превратить в геометрию через библиотеку `entity` саму по себе, нужно найти underlying Instance и читать напрямую. Следи за [Methodology](../methodology) когда новый part API будет выкачен.

---

## `GetPartsCount`

```lua
entity.GetPartsCount() → int
```

Длина массива `GetParts()` без аллокации Lua table. Дешёвая для вызова каждый кадр.

Проверено вживую: вернула `0` в Western игре.

```lua
if entity.GetPartsCount() > 0 then
    print("карта экспортит", entity.GetPartsCount(), "cached parts")
end
```

---

## `AddModel`

```lua
entity.AddModel(key: string, data: table)
```

Регистрирует Roblox Model в кешированном entity-list чита, чтобы он появлялся в последующих `GetPlayers()` вызовах и получал такое же hitbox / aim treatment как реальный игрок. Полезно для добавления NPC ботов или non-`Player` персонажей которых чит не обнаруживает автоматически.

Поля `data` table, из dump:

| Поле | Обязательно | Тип | Заметка |
|---|---|---|---|
| `Character`      | да  | `Instance`     | Model содержащий body parts |
| `PrimaryPart`    | да  | `Instance`     | `BasePart` внутри Character используемый как position reference |
| `Name`           | да  | `string`       | имя в `p.Name` |
| `DisplayName`    | нет | `string`       | `p.DisplayName` |
| `Team`           | нет | `string`       | team string |
| `Weapon`         | нет | `string`       | идентификатор оружия |
| `Humanoid`       | нет | `Instance`     | `Humanoid` для чтения MoveDirection |
| `HealthInstance` | нет | `Instance`     | предпочтительный источник HP, перебивает raw Health |
| `Health`         | нет | `number`       | текущий HP если нет HealthInstance |
| `MaxHealth`      | нет | `number`       | макс HP |

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

:::info Schema на API-границе пермиссивный
Проверено вживую: `AddModel` не валидирует shape `data` на месте вызова. Любая таблица которую мы пробовали (пустая, `{Name=...}`, `{Bones={...}}`, `{Color=Color3...}`, full canonical) вернула `true`. Слой ESP/aim чита читает well-known ключи (`Character`, `PrimaryPart` и т.д.) - лишние или пропущенные ключи не raise здесь, но зарегистрированная модель без `Character` / `PrimaryPart` не даст usable entity downstream.

| Вызов | Проверенный результат |
|---|---|
| `AddModel("k", {})`                            | `true` |
| `AddModel("k", { Name = "X" })`                | `true` |
| `AddModel("k", canonical_shape)`               | `true` |
| `AddModel("k", "not-a-table")`                 | error: `"bad argument #2 to '?' (table expected, got string)"` |
| `AddModel("k", 42)`                            | error: `"bad argument #2 to '?' (table expected, got number)"` |
| `RemoveModel("non_existent_key")`              | `false` |

`RemoveModel` возвращает `true` когда запись была удалена, `false` когда ключ неизвестен. `ClearModels()` возвращает `true`.

Live-подтверждение что зарегистрированная entity появляется в `GetPlayers()` всё ещё в ожидании - у нас не было стабильной bot-модели в test-сценах. Argument-validation behavior выше проверен.
:::

---

## `EditModel`

```lua
entity.EditModel(key: string, data: table)
```

Мутирует уже зарегистрированную кастомную entity по `key`. Используй ту же `data` shape что и в `AddModel`, изменяются только переданные поля. Полезно для обновления Health каждый тик на кастомном NPC.

```lua
entity.EditModel("bot_zombie_01", { Health = 42, Weapon = "Axe" })
```

Статус: задокументировано из dump, не roundtripped.

---

## `RemoveModel`

```lua
entity.RemoveModel(key: string)
```

Удаляет одну кастомную entity по её `key`. Сама Roblox Model не трогается, удаляется только запись в кеше чита.

```lua
entity.RemoveModel("bot_zombie_01")
```

Статус: задокументировано из dump, не roundtripped.

---

## `ClearModels`

```lua
entity.ClearModels()
```

Удаляет все кастомные entity сразу. Встроенные игроки (реальные Roblox `Player` инстансы) не затрагиваются.

Статус: задокументировано из dump, не roundtripped.

---

## Паттерны

### Live ESP-прямоугольник напрямую из `BoundingBox`
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

### Health-бар над головой каждого врага
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

### Триггер только когда враг реально под прицелом
```lua
cheat.register("onUpdate", function()
    local tgt = entity.GetTarget()
    if not tgt or not tgt.IsAlive or not tgt.IsEnemy then return end
    print("trigger window открыт на", tgt.Name, "hp=", tgt.Health)
end)
```

### Прогон по всем bones одного игрока
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
