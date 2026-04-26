---
sidebar_position: 4
title: game
---

# `game`

Точка входа в Roblox DataModel плюс несколько cheat-side хелперов (FFlag-доступ, silent aim, player whitelist). 5 канонических функций плюс маленький набор pre-resolved полей.

| | |
|---|---|
| **Функций** | 5 (15 с алиасами) |
| **Проверено вживую** | 3 из 5 (SetFFlag и SilentAim частично: задокументированы из dump, не выполнены ради безопасности) |
| **Требуемый event** | нет |
| **Сайд-эффекты** | `SetFFlag` мутирует client FFlag, `SilentAim` целится (и может выстрелить), `PlayerWhitelist` добавляет имя в friendly-список |

> **Алиасы.** Три формы у каждой: `game.GetService` / `getService` / `get_service`. См. [Обзор / Конвенция именования](../overview#конвенция-именования).

> **Dot syntax, не двоеточие.** `game.GetService("Players")` работает, `game:GetService("Players")` падает потому что `game` это Lua-table proxy, а не Roblox Instance userdata.

## Краткий справочник

| Функция | Сигнатура | Заметка | Статус |
|---|---|---|---|
| [`GetService`](#getservice)         | `(name: string) → userdata \| nil` | получить Roblox-сервис по ClassName, возвращает nil для unknown / не-string args (кроме nil который raise'ит) | <span className="status-badge verified">проверено</span> |
| [`GetFFlag`](#getfflag)             | `(name: string, type: string) → value \| nil` | прочитать Roblox FFlag, type должен быть `'int'`, `'bool'`, `'float'` или `'double'` | <span className="status-badge verified">проверено</span> |
| [`SetFFlag`](#setfflag)             | `(name: string, value, type: string)` | записать Roblox FFlag, тот же список типов что у `GetFFlag` | <span className="status-badge partial">частично</span> |
| [`SilentAim`](#silentaim)           | `(x: number, y: number)` | прицелиться в screen-позицию, способна вызвать выстрел | <span className="status-badge partial">частично</span> |
| [`PlayerWhitelist`](#playerwhitelist) | `(name: string)` | добавить player username в friendly-список чита | <span className="status-badge verified">проверено</span> |

## Поля `game.*`

Проверено вживую:

| Поле | Тип | Заметка |
|---|---|---|
| `game.Workspace`        | `userdata` (Roblox `Workspace`)        | всегда доступен, ClassName=`Workspace` |
| `game.Players`          | `userdata` (Roblox `Players`)          | всегда доступен, ClassName=`Players` |
| `game.LocalPlayer`      | `userdata` (Roblox `Player`)           | всегда доступен, ClassName=`Player` |
| `game.CameraPosition`   | `Vector3`                              | живая позиция камеры, например `(1884.64, 211.28, 3625.01)` |
| `game.Lighting`         | `nil`                                  | **прямой `game.Lighting` равен `nil` в этом билде, используй `game.GetService("Lighting")`** |

> ⚠️ Другие Roblox-сервисы вроде `Stats`, `MarketplaceService`, `RunService` и т.д. **не** pre-resolved как `game.<Name>`. Всегда используй `game.GetService(name)`.

---

## `GetService`

```lua
game.GetService(name: string) → userdata | nil
```

Возвращает Roblox-сервис Instance чей ClassName равен `name`. Возвращает `nil` для unknown service-имён, пустой строки или не-string аргументов. Передача `nil` raise'ит ошибку.

Проверено вживую, сервисы которые вернули userdata:

`Players`, `Lighting`, `Workspace`, `HttpService`, `RunService`, `TeleportService`, `TextService`, `GamepadService`, `UserInputService`, `ReplicatedStorage`, `StarterGui`, `StarterPack`, `Stats`, `MarketplaceService`.

Проверено вживую, вернули `nil`:

`ServerStorage` (только server-side, не экспортирован клиенту).

Error-кейсы:
- `GetService('NotARealService123')` → `nil`
- `GetService('')` → `nil`
- `GetService(123)` → `nil`
- `GetService(nil)` raise'ит `"bad argument #1 to '?' (string expected, got no value)"`

```lua
local players = game.GetService("Players")
local lighting = game.GetService("Lighting")
local http = game.GetService("HttpService")
```

---

## `GetFFlag`

```lua
game.GetFFlag(name: string, type: string) → value | nil
```

Читает Roblox `FFlag` (FastFlag) по имени. Аргумент `type` говорит функции как декодировать underlying value.

Проверенные валидные type-строки: `'int'`, `'bool'`, `'float'`, `'double'`.

Любой другой type raise'ит `"Invalid FFlag type specified: '<type>'. Use 'int', 'bool', 'float', or 'double'."`. Отсутствующий `name` или `type` raise'ит стандартный `"bad argument #N (string expected, got no value)"`.

Если FFlag с указанным именем отсутствует в этом Roblox-клиенте, вызов возвращает `nil` (без ошибки). В нашем verify-прогоне популярные имена вроде `DebugDisplayFPS`, `TaskSchedulerTargetFps`, `EnableQuickGameLaunch` все вернули `nil`. Roblox держит внутреннюю flag-таблицу и экспортирует только subset имён в cheat-sandbox.

```lua
local fps_cap = game.GetFFlag("TaskSchedulerTargetFps", "int")
if fps_cap then
    print(string.format("Roblox FPS cap = %d", fps_cap))
else
    print("flag не экспортирован в этом билде")
end
```

:::warning Это **не** крашер несмотря на старые доки
Пара `game.GetFFlag/SetFFlag` считалась native-крашером в старой community-памяти, но проверена безопасной в билде `version-390ba09e7e944154`. См. [Триггеры крашей / Развенчанные мифы](../crash-triggers#развенчанные-мифы-это-не-крашеры).
:::

---

## `SetFFlag`

```lua
game.SetFFlag(name: string, value, type: string)
```

Записывает значение в Roblox FFlag. Аргумент `type` использует тот же набор строк что у `GetFFlag` (`'int'`, `'bool'`, `'float'`, `'double'`). Value интерпретируется в этом типе.

Статус: **частично**. Сигнатура задокументирована из dump и `GetFFlag`-аналог полностью проверен. Мы не вызывали `SetFFlag` в verify-прогоне потому что мутирование client FFlag меняет Roblox runtime behavior способами которые сложно откатить без рестарта Roblox.

```lua
game.SetFFlag("DebugDisplayFPS", true, "bool")
```

:::danger Сайд-эффект
Плохая FFlag-запись может изменить Roblox internal behavior (rendering, networking, animation). Восстанови предыдущее значение или перезапусти Roblox если экспериментируешь с этим.
:::

---

## `SilentAim`

```lua
game.SilentAim(x: number, y: number)
```

Говорит cheat-aim-системе указать на данную screen-space `(x, y)`. Используется в triggerbot / silent-aim реализациях.

Статус: **частично**. Сигнатура задокументирована из dump. Не вызывалась в verify-прогоне потому что в зависимости от game mode и aim-конфигурации это может выстрелить с текущего оружия игрока.

```lua
local mp = utility.GetMousePos()
game.SilentAim(mp[1], mp[2])
```

:::danger Сайд-эффект
Может вызвать выстрел. Комбинируй с троттлингом и проверкой friend/enemy (например через [`entity.GetTarget`](./entity#gettarget)) перед вызовом.
:::

---

## `PlayerWhitelist`

```lua
game.PlayerWhitelist(name: string)
```

Добавляет username игрока в friendly-список чита. После этого вызова поле `IsWhitelisted` соответствующего игрока становится `true` и aim-системы должны его пропускать.

Возвращает `nil`. Тот же паттерн обработки args что у `GetService`:
- `PlayerWhitelist('verify_probe_xyz_999')` → `nil` (silent success)
- `PlayerWhitelist('')` → `nil`
- `PlayerWhitelist(123)` → `nil` (silent, число не coerce в реальную запись)
- `PlayerWhitelist(nil)` raise'ит `"bad argument #1 to '?' (string expected)"`

```lua
game.PlayerWhitelist("MyFriendUserName")
```

Документированного `RemovePlayerWhitelist`-аналога нет. Однажды добавленная запись живёт всё время жизни скрипта.

---

## Паттерны

### Получить count игроков на сервере
```lua
local players = game.GetService("Players")
print(string.format("на сервере %d игроков", #players:GetChildren()))
```

### Использовать сервис который НЕ pre-resolved на `game`
```lua
local market = game.GetService("MarketplaceService")
```

### Проверить FFlag и fallback если не экспортирован
```lua
local cap = game.GetFFlag("TaskSchedulerTargetFps", "int")
if not cap or cap == 0 then cap = 60 end
print("frame budget:", cap)
```

### Whitelist'нуть друзей при загрузке скрипта
```lua
for _, friend in ipairs({"FriendOne", "FriendTwo"}) do
    game.PlayerWhitelist(friend)
end
```

### Читать живую позицию камеры
```lua
cheat.register("onUpdate", function()
    local cam = game.CameraPosition
    if cam then
        print(string.format("cam=(%.0f, %.0f, %.0f)", cam.X, cam.Y, cam.Z))
    end
end)
```
