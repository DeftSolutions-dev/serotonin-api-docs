---
sidebar_position: 5
title: cheat
---

# `cheat`

Три core-хелпера от Serotonin runtime: регистрация event'ов (`Register`), запрос window size (`GetWindowSize`), runtime-исполнение кода (`LoadString`). 3 канонических функции.

| | |
|---|---|
| **Функций** | 3 (8 с алиасами) |
| **Проверено вживую** | 2 из 3 (`Register` и `GetWindowSize`) |
| **Требуемый event** | нет |
| **Сайд-эффекты** | `Register` добавляет персистентный per-event callback который нельзя unregister на время жизни скрипта. `LoadString` исполнял бы код если бы работал. |

> **Алиасы.** `Register` имеет **две** формы (`cheat.Register` / `cheat.register`). `GetWindowSize` и `LoadString` имеют по **три** формы (PascalCase / camelCase / snake_case). См. [Обзор / Конвенция именования](../overview#конвенция-именования).

> **Алиасы это разные function objects.** Проверено: `cheat.Register == cheat.register` возвращает `false`, хотя они вызывают одну underlying C-функцию и ведут себя идентично. Не полагайся на `==` для идентификации конкретной API-функции, сравнивай по имени.

## Краткий справочник

| Функция | Сигнатура | Заметка | Статус |
|---|---|---|---|
| [`Register`](#register)         | `(event: string, callback: function)` | регистрирует callback для именованного event'а. **Без валидации event-имени**, см. ниже | <span className="status-badge verified">проверено</span> |
| [`GetWindowSize`](#getwindowsize) | `() → width, height` (multi-return) | размер окна Roblox в пикселях | <span className="status-badge verified">проверено</span> |
| [`LoadString`](#loadstring)     | `(name: string, code: string)` | runtime-исполнение кода. **Сломан в билде `version-390ba09e7e944154`** | <span className="status-badge partial">частично</span> |

---

## `Register`

```lua
cheat.Register(event: string, callback: function)
```

Регистрирует callback для именованного event'а. Callback вызывается каждый раз когда чит диспатчит этот event.

### Известные диспатчируемые event'ы

| Имя event'а | Когда срабатывает |
|---|---|
| `onUpdate`     | logic tick (~5 мс) |
| `onSlowUpdate` | background tick (~1 с) |
| `onPaint`      | per-frame, **обязательный контекст для всех `draw.*`** |
| `shutdown`     | при выгрузке скрипта |
| `newPlace`     | при teleport'е игрока в новое место |

### Важно: НЕТ валидации event-имени

Проверено: `cheat.Register` молча принимает **любую** строку (или число) в первом аргументе, включая:

- Garbage-имена вроде `"totally_invalid_event_xyz_999"` → `ok = true`, без ошибки
- Пустую строку `""` → `ok = true`
- Wrong-case версии known events: `"OnUpdate"`, `"ONUPDATE"`, `"on_update"` → все `ok = true`
- Число: `Register(123, function() end)` → `ok = true`

Эти вызовы регистрируют callback во внутреннюю таблицу, но callback **никогда не сработает** потому что никто не диспатчит это event-имя. 5 имён в таблице выше case-sensitive и единственные которые чит реально диспатчит.

### Валидация аргументов

| Вызов | Результат |
|---|---|
| `Register()`              | `"bad argument #1 to '?' (string expected, got no value)"` |
| `Register("onUpdate")`    | `"bad argument #2 to '?' (function expected, got no value)"` |
| `Register("onUpdate", nil)`     | `"bad argument #2 to '?' (function expected, got nil)"` |
| `Register("onUpdate", "str")`   | `"bad argument #2 to '?' (function expected, got string)"` |
| `Register(nil, fn)`             | `"bad argument #1 to '?' (string expected, got nil)"` |
| `Register(123, fn)`             | принят молча (числовые event-имена допустимы но не диспатчатся) |

### Нельзя unregister

Нет `Unregister` API. После вызова `cheat.Register` callback живёт всё время жизни скрипта. Перезапуск скрипта (без рестарта Roblox) **накапливает** новые callbacks поверх старых. Защищайся от двойной регистрации в development:

```lua
if not _ALREADY_LOADED then
    _ALREADY_LOADED = true
    cheat.Register("onPaint", function()

    end)
end
```

### Примеры

```lua
cheat.Register("onUpdate", function()
    local lp = entity.GetLocalPlayer()
    if not lp then return end

end)

cheat.Register("onPaint", function()
    draw.Text("hello", 10, 10, Color3.fromRGB(255, 255, 255), 14, 1)
end)

cheat.Register("shutdown", function()
    print("script unloading, cleaning up...")
end)
```

---

## `GetWindowSize`

```lua
cheat.GetWindowSize() → width: number, height: number
```

Возвращает пиксельные размеры окна Roblox как **два return value** (multi-return), не packed table.

Проверено вживую: `cheat.GetWindowSize()` вернул `(2048, 1208)` на 2K-дисплее в windowed mode. `select("#", cheat.GetWindowSize())` вернул `2`.

```lua
local w, h = cheat.GetWindowSize()
draw.Text(string.format("%dx%d", w, h), w - 80, 4, Color3.fromRGB(200, 200, 200), 12, 1)
```

Можно также упаковать в таблицу если нужно:

```lua
local size = { cheat.GetWindowSize() }
```

Сравни с [`draw.GetScreenSize`](../libraries/utility#worldtoscreen) (когда будет задокументирован), это то же значение но вызывается внутри drawing-контекста.

---

## `LoadString`

```lua
cheat.LoadString(scriptContent: string, scriptName: string)
```

:::danger Всё ещё сломан в билде `version-390ba09e7e944154`
Перепроверено вживую через API-verifier: `cheat.LoadString("return 1+2", "verify_chunk")` поднимает `"C++ exception"` - ту же uncatchable native-ошибку из ранних аудитов. Patch-нота *"Improved exception safety in decompiler"* в этом билде **не** сделала `LoadString` рабочим; каждый 2-аргументный вызов который мы пробовали (валидный Lua source, syntax errors, runtime errors, raw bytecode, пустые строки) поднимает `"C++ exception"`, и `pcall` его **не ловит** надёжно - функция никогда не исполняет chunk.

Считай `cheat.LoadString` **нерабочим** в текущем билде. Используй стандартный Lua `loadstring` / `load`.
:::

Сигнатура (из IntelliSense, подтверждена через `pcall`):

- Аргумент 1: `scriptContent` - Lua source или LuaJIT bytecode (обязательный)
- Аргумент 2: `scriptName` - имя chunk'а для error-сообщений (обязательный)
- Return: должен был бы быть загруженный chunk; в текущем билде вызов поднимает `"C++ exception"` до возврата

:::tip Используй стандартный Lua `loadstring` для типичного запуска удалённых скриптов
Для классического паттерна "скачать скрипт по HTTP и выполнить" правильный инструмент - стандартный Lua-5.1 `loadstring` (доступен в sandbox'енном LuaJIT Serotonin'а). Он компилирует исходник в callable chunk, который ты вызываешь сам:

```lua
http.Get(
    "https://example.com/payload.lua",
    {},
    function(response)
        local chunk, err = loadstring(response)
        if chunk then chunk() end
    end
)
```

`loadstring` возвращает `function | nil, errorMessage`, позволяет проверить chunk перед запуском и поддерживает compile-time syntax errors. `cheat.LoadString` это отдельный Serotonin-helper, чьи side-effects в текущем билде это не load-and-return; для типичных задач сначала бери `loadstring`.
:::

### Проверенная валидация аргументов (эти ошибки случаются ДО C++ exception)

| Вызов | Результат |
|---|---|
| `LoadString()`                | `"bad argument #1 to '?' (string expected, got no value)"` |
| `LoadString("x = 1")`         | `"bad argument #2 to '?' (string expected, got no value)"` |
| `LoadString(nil, "x = 1")`    | `"bad argument #1 to '?' (string expected, got nil)"` |
| `LoadString("n", nil)`        | `"bad argument #2 to '?' (string expected, got nil)"` |
| `LoadString("n", 123)`        | `"C++ exception"` (числовой code доходит до loader'а) |

### Проверенные failure modes (все 2-arg, любой код который мы пробовали)

| Вызов | Результат |
|---|---|
| `LoadString("a", "x = 1")`               | `"C++ exception"` |
| `LoadString("a", "return 42")`           | `"C++ exception"` (lone `return` claim из ранних доков) |
| `LoadString("a", "this is = not.lua")`   | `"C++ exception"` (syntax error) |
| `LoadString("a", "error('boom')")`       | `"C++ exception"` (runtime error) |
| `LoadString("a", "file.write('m','EXEC')")` | `"C++ exception"`, файл не изменился |

Если нужно динамическое исполнение кода, используй стандартный Lua `loadstring`/`load` (всё ещё в sandbox) и вызывай его явно:

```lua
local fn, err = loadstring("return 1 + 2")
if fn then print(fn()) else print("compile failed:", err) end
```

Этот паттерн надёжно работает в sandbox в отличие от `cheat.LoadString`.

---

## Паттерны

### Идемпотентная загрузка скрипта
```lua
if not _MTC_BOOTED then
    _MTC_BOOTED = true
    cheat.Register("onUpdate", function() ... end)
    cheat.Register("onPaint",  function() ... end)
end
```

### Window-aware HUD-якорь
```lua
cheat.Register("onPaint", function()
    local w, h = cheat.GetWindowSize()

    local bx, by = w - 240, h - 80
    draw.RectFilled(bx, by, 230, 70, Color3.new(0.1, 0.1, 0.12), 4, 0.85)
    draw.Text("MTC v0.1", bx + 8, by + 8, Color3.new(1, 1, 1), 14, 1)
end)
```

### Cleanup при unload
```lua
cheat.Register("shutdown", function()

    file.write("session.log", string.format("ended at %d\n", utility.GetTickCount()))
end)
```

### Сравнение event-таймингов
```lua
local update_count, paint_count = 0, 0
cheat.Register("onUpdate", function() update_count = update_count + 1 end)
cheat.Register("onPaint",  function() paint_count  = paint_count  + 1 end)
cheat.Register("onSlowUpdate", function()
    print(string.format("update=%d/s  paint=%d/s", update_count, paint_count))
    update_count, paint_count = 0, 0
end)
```
