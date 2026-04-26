---
sidebar_position: 1
title: Обзор
---

# Обзор

Serotonin запускает скрипты на песочничном **LuaJIT 2.0.3**-ядре (которое реализует Lua 5.1) с вырезанными LuaJIT-специфичными глобалами. `_VERSION` возвращает `"Lua 5.1"` потому что именно эту версию языка реализует LuaJIT 2.0.3. `jit`, `ffi`, `os`, `io`, `debug` вырезаны из sandbox. `string.buffer` и таблица `buffer` **отсутствуют** - этот API появился только в LuaJIT 2.1, а текущий билд на старом 2.0.3. BitOp-библиотека `bit` экспонирована (`band`, `bor`, `bxor`, `bnot`, `lshift`, `rshift`, `arshift`, `rol`, `ror`, `bswap`, `tobit`, `tohex`) - проверено вживую. Скрипты лежат в `C:\Serotonin\scripts\*.lua` и загружаются через вкладку **Scripting**. Файлы, записываемые скриптами через `file`-библиотеку, попадают в `C:\Serotonin\files\` (sandbox).

## Жизненный цикл

Скрипт регистрирует callback'и через `cheat.Register(event, fn)`. Доступные события:

| Событие | Частота (проверено вживую) | Для чего |
|---|---|---|
| `onUpdate` | ~10 мс (~95–100 Гц) cache thread | Логика, поллинг кэшированного состояния |
| `onSlowUpdate` | ровно 1 с | Фоновые задачи, таймеры |
| `paint` (алиас `onPaint`) | каждый кадр, ~60–250 Гц зависит от дисплея и нагрузки чита; срабатывает независимо от фокуса оверлея | Рисование, обязательно для любого `draw.*` |
| `shutdown` | при выгрузке | Очистка |
| `newPlace` | смена места | Сброс состояния при телепорте |

И `paint`, и `onPaint` алиасы диспатчатся в один per-frame слот - регистрация callback'ов под обоими именами **удваивает** rate (проверено: 2 handler'а → 2 вызова на кадр).

Заметка: `cheat.Register` **не валидирует** имя события - передача неизвестного имени (или числа) молча принимается. Реально диспатчатся только пять имён выше.

```lua
cheat.register("onPaint", function()
    draw.TextOutlined("hello", 20, 20, Color3.fromRGB(255, 255, 255), "Verdana")
end)
```

## Конвенция именования

Проверено вживую полным проходом по 177 документированным функциям, userdata-методам и static'ам в **пяти** регистровых формах: PascalCase, camelCase, snake_case, full-lowercase и SCREAMING_SNAKE_CASE.

**Aggregate-результат (177 пробников):**

| Стиль | Привязано | Заметка |
|---|---|---|
| **PascalCase** (`GetTickCount`)            | 164 / 177 | Дефолт. Единственная library где PC **не** привязан - это `file` (см. ниже). |
| **camelCase** (`getTickCount`)             | 169 / 177 | Самая универсальная форма после PascalCase. Всегда идёт в паре с PascalCase. |
| **snake_case** (`get_tick_count`)          | 163 / 177 | Почти всегда привязано для обычных составных имён. Ломается на multi-letter abbreviations (см. edge cases). |
| **lowercase** (`gettickcount`)             | 79 / 177  | Только однословные имена + library `file` + горстка "compound-выглядящих-но-обрабатываемых-как-одно-слово" имён. |
| **SCREAMING_SNAKE_CASE** (`GET_TICK_COUNT`) | 0 / 177 | **Нигде не привязано.** |

**Общее правило:** для обычного составного имени вроде `GetTickCount` чит привязывает **PascalCase + camelCase + snake_case** (3 формы). Однословные имена вроде `Read` сворачиваются до **PascalCase + lowercase** (2 эффективных формы - для них lowercase = camelCase = snake_case).

| PascalCase | camelCase | snake_case |
|---|---|---|
| `utility.GetTickCount`        | `utility.getTickCount`        | `utility.get_tick_count` |
| `entity.GetPlayers`           | `entity.getPlayers`           | `entity.get_players` |
| `ui.NewCheckbox`              | `ui.newCheckbox`              | `ui.new_checkbox` |
| `draw.RectFilled`             | `draw.rectFilled`             | `draw.rect_filled` |
| `instance:FindFirstChild`     | `instance:findFirstChild`     | `instance:find_first_child` |
| `instance:GetAttributes`      | `instance:getAttributes`      | `instance:get_attributes` |
| `player:GetBonePosition`      | `player:getBonePosition`      | `player:get_bone_position` |

### Edge cases (проверено вживую)

Эти отклоняются от общего правила. Если сомневаешься - используй PascalCase:

- **Library `file` lowercase-каноничен.** `file.read`, `file.write`, `file.append`, `file.listdir`, `file.exists`, `file.isdir`, `file.mkdir`, `file.delete` - это канонические имена. PascalCase-варианты (`file.Read`, `file.Write`, `file.Append`, `file.Exists`, `file.Delete`) **не привязаны**, но экспонированы только в **lowercase-форме** (а `Read`/`Write`/`Append`/`Exists`/`Delete` ещё и имеют camelCase + snake_case формы).
- **`file.ListDir` / `IsDir` / `MkDir`** привязаны **только** как `file.listdir` / `file.isdir` / `file.mkdir` (обрабатываются читом как однословные). camelCase (`listDir`) и snake_case (`list_dir`) формы **не привязаны**.
- **Multi-letter аббревиатуры вроде `RGB`, `HSV`, `FFlag`** выживают только через PascalCase и camelCase. Snake_case-форма которая разбила бы каждую заглавную (`from_r_g_b`, `to_h_s_v`, `set_f_flag`) **не привязана**:
  - `Color3.fromRGB` / `Color3.fromHSV` / `Color3:ToHSV` существуют только как PascalCase + camelCase.
  - `game.SetFFlag` / `game.GetFFlag` существуют только как PascalCase + camelCase.
- **`Vector3.zero` / `.one` / `.xAxis` / `.yAxis` / `.zAxis`** - это pre-allocated `Vector3` userdata-properties, не функции. Они живут точно по перечисленным именам (PascalCase / camelCase как написано) - у них нет алиасов потому что это значения, а не callables.
- **SCREAMING_SNAKE_CASE нигде не привязано.** 0 из 177 пробников вернул function под screaming-формой.

Эта документация использует **PascalCase** как канонический для cheat-side библиотек (и **lowercase** для `file`). Используй любой стиль, который подходит твоему коду - только не пытайся в SCREAMING_SNAKE_CASE, его нигде нет.

:::info Алиасы это НЕ один и тот же Lua function object
Проверено вживую: `cheat.Register == cheat.register` возвращает `false`, хотя оба вызывают одну C-функцию и ведут себя идентично. Каждая alias-форма зарегистрирована как отдельный Lua callable обёртывающий один native handler. Не используй `==` для проверки является ли значение конкретной API-функцией, сравнивай по имени.
:::

## Поверхность песочницы

### Доступные глобалы

```
ui  string  mouse  http  table  type  next  pairs  ipairs  getmetatable  setmetatable
getfenv  setfenv  rawget  rawset  rawequal  unpack  select  tonumber  tostring  error
pcall  xpcall  loadfile  load  loadstring  dofile  gcinfo  collectgarbage  newproxy
print  _VERSION  coroutine  package  entity  websocket  audio  memory
file  keyboard  Color3  math  game  cheat  bit  draw  utility  Vector3  module  assert
require
```

### Подтверждённо отсутствуют (возвращают nil)

```
_G  _ENV  workspace  shared  typeof  tick  time  delay  spawn  wait  task  script
Instance  Enum  CFrame  Vector2  UDim  UDim2  Rect  TweenInfo  Region3  Ray  BrickColor
NumberRange  NumberSequence  ColorSequence  PhysicalProperties  Axes  Faces
os  io  debug  bit32  utf8  rawlen  jit  ffi  buffer  raknet  string.buffer
```

`buffer` и `raknet` экспонировались в некоторых ранних билдах, но **не привязаны в текущем билде** (проверено вживую: `type(buffer) == "nil"`, `type(raknet) == "nil"`). Doc-страницы для них удалены - документировать нечего.

Для доступа к таблице окружения используй `getfenv(1)`.

## Userdata против table

- **Tables**: каждая API-библиотека (`utility`, `memory`, `entity`, ...), это Lua-таблица, индексируемая через `.`.
- **Userdata**: возвращается API-вызовами (`Vector3`, `Color3`, Roblox `Instance`, игроки из `entity.GetPlayers()`, парты из `entity.GetParts()`). Методы на userdata вызываются через `:` и живут в `metatable`.

```lua
local v = Vector3.new(1, 2, 3)
print(v.X, v.Y, v.Z, v.Magnitude)
print(v:Lerp(Vector3.new(10, 0, 0), 0.5))
```

## Вызов Roblox-сервисов

`game.GetService` использует **dot-синтаксис**, не двоеточие:

```lua
local players  = game.GetService("Players")
local lighting = game.GetService("Lighting")
```

Подтверждённо работающие сервисы (проверено вживую): `Players`, `Lighting`, `Workspace`, `HttpService`, `RunService`, `TeleportService`, `TextService`, `GamepadService`, `UserInputService`, `ReplicatedStorage`, `StarterGui`, `StarterPack`, `Stats`, `MarketplaceService`. `ServerStorage` возвращает `nil` (не экспортирован клиенту).

> ⚠️ Прямой `game.<Service>` pre-resolved только для `Workspace`, `Players`, `LocalPlayer`. Даже `game.Lighting` возвращает `nil`, нужно использовать `game.GetService("Lighting")`.

## Что читать дальше

1. [Триггеры крашей](./crash-triggers), что нельзя трогать
2. [`utility`](./libraries/utility), первый референс библиотеки
3. [Для LLM](./llms), готовые ресурсы для AI-агентов

## Статус документации

Сайт наполняется постепенно. Каждая страница библиотеки публикуется только после того, как каждая сигнатура на ней проверена в живой песочнице.

| Компонент | Статус |
|---|---|
| Референс библиотеки `utility` | Опубликовано |
| Остальные 15 библиотек | В работе |
| Документация userdata-типов | Ожидает |
| Рабочие примеры | Ожидает |
| Консолидированный `llms-full.md` | Ожидает |
