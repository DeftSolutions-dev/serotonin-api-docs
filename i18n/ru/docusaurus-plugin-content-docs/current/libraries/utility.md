---
sidebar_position: 1
title: utility
---

# `utility`

Время, случайные числа, мышь, буфер обмена, проекция в экран. 15 канонических функций.

| | |
|---|---|
| **Функций** | 15 (45 с алиасами) |
| **Проверено вживую** | 13 из 15 (GetFingerprint и TeleportToPlace частично) |
| **Требуемый event** | нет |
| **Сайд-эффекты** | `MoveMouse`, `SetClipboard`, `TeleportToPlace` меняют глобальное состояние. `LoadImage` выделяет новый texture handle при каждом вызове. |

> **Алиасы.** Каждая функция на этой странице существует в трёх формах: `utility.GetTickCount` (канон), `utility.getTickCount` (camelCase), `utility.get_tick_count` (snake_case). Все три зовут одну и ту же C-функцию. См. [Обзор / Конвенция именования](../overview#конвенция-именования).

## Краткий справочник

| Функция | Сигнатура | Заметка | Статус |
|---|---|---|---|
| [`RandomInt`](#randomint)             | `(a: int, b: int) → int`                          | инклюзивный `[a, b]`                  | <span className="status-badge verified">проверено</span> |
| [`RandomFloat`](#randomfloat)         | `(a: number, b: number) → number`                 | инклюзивный `[a, b]`                  | <span className="status-badge verified">проверено</span> |
| [`GetTickCount`](#gettickcount)       | `() → int`                                        | миллисекунды с запуска чита           | <span className="status-badge verified">проверено</span> |
| [`GetDeltaTime`](#getdeltatime)       | `() → number`                                     | секунды с прошлого кадра              | <span className="status-badge verified">проверено</span> |
| [`GetSystemTime`](#getsystemtime)     | `() → {year, month, day, hour, minute, second, weekday}` | локальное время, weekday `0=Вс..6=Сб` | <span className="status-badge verified">проверено</span> |
| [`GetTimestamp`](#gettimestamp)       | `() → int`                                        | unix-секунды (UTC)                    | <span className="status-badge verified">проверено</span> |
| [`GetFingerprint`](#getfingerprint)   | `() → string`                                     | пусто в этом билде                    | <span className="status-badge partial">частично</span> |
| [`GetMousePos`](#getmousepos)         | `() → {[1] = x, [2] = y}`                         | одна array-table, не multi-return     | <span className="status-badge verified">проверено</span> |
| [`MoveMouse`](#movemouse)             | `(dx: int, dy: int)`                              | относительный offset, НЕ pixel-perfect (Win-ускорение влияет) | <span className="status-badge verified">проверено</span> |
| [`GetMenuState`](#getmenustate)       | `() → bool`                                       | `true` если меню чита открыто         | <span className="status-badge verified">проверено</span> |
| [`WorldToScreen`](#worldtoscreen)     | `(v3: Vector3) → screenX: number, screenY: number, onScreen: bool` | `onScreen` = проекция валидна, не bounds | <span className="status-badge verified">проверено</span> |
| [`GetClipboard`](#getclipboard)       | `() → string`                                     | UTF-8, пусто для не-текста            | <span className="status-badge verified">проверено</span> |
| [`SetClipboard`](#setclipboard)       | `(s: string)`                                     | перезаписывает системный буфер        | <span className="status-badge verified">проверено</span> |
| [`LoadImage`](#loadimage)             | `(data: string) → number`                         | PNG/JPG байты, новый texture id каждый вызов | <span className="status-badge verified">проверено</span> |
| [`TeleportToPlace`](#teleporttoplace) | `(jobId: string)`                                 | join Roblox-сервер по Job ID, сетевой сайд-эффект | <span className="status-badge partial">частично</span> |

---

## `RandomInt`

```lua
utility.RandomInt(a: int, b: int) → int
```

Возвращает случайное целое в инклюзивном диапазоне `[a, b]`. Передавай `a <= b`. Распределение равномерное.

Проверено вживую: `RandomInt(1, 100)` вернул `69`, потом `38` на последовательных вызовах.

```lua
local roll = utility.RandomInt(1, 100)
print(roll)
```

---

## `RandomFloat`

```lua
utility.RandomFloat(a: number, b: number) → number
```

Возвращает случайное число с плавающей точкой в диапазоне `[a, b]`. Передавай `a <= b`. Отрицательные диапазоны допустимы: `RandomFloat(-1, 1)` работает.

Проверено вживую: `RandomFloat(0, 1)` вернул `0.26634337488978`, потом `0.48977073860767`.

```lua
local jitter = utility.RandomFloat(-0.5, 0.5)
```

---

## `GetTickCount`

```lua
utility.GetTickCount() → int
```

Счётчик тиков чита в миллисекундах. Монотонно возрастает.

Проверенное живое значение: `99868805` (около 27 часов с момента запуска чита).

Используй для троттлинга, кулдаунов, дельт между кадрами:

```lua
local last = 0
cheat.register("onUpdate", function()
    local now = utility.GetTickCount()
    if now - last < 500 then return end
    last = now
    print("срабатывает каждые 500 мс")
end)
```

---

## `GetDeltaTime`

```lua
utility.GetDeltaTime() → number
```

Время в **секундах** с прошлого кадра.

Проверенное живое значение: `0.0045325998216867` (около 220 FPS).

```lua
cheat.register("onPaint", function()
    local fps = 1 / math.max(utility.GetDeltaTime(), 0.0001)
    draw.TextOutlined(string.format("FPS: %.0f", fps), 10, 10,
                      Color3.fromRGB(255, 255, 255), "Verdana")
end)
```

---

## `GetSystemTime`

```lua
utility.GetSystemTime() → { year, month, day, hour, minute, second, weekday }
```

Локальное системное время как table. Все поля целочисленные.

`weekday` следует C-конвенции `tm_wday`: `0 = воскресенье`, `1 = понедельник`, ... `6 = суббота`. Проверено вживую: 25 апреля 2026 была суббота, и вызов вернул `weekday = 6`.

Проверенный живой вывод:
```
{ year=2026, month=4, day=25, hour=18, minute=24, second=32, weekday=6 }
```

```lua
local t = utility.GetSystemTime()
local stamp = string.format("%04d-%02d-%02d %02d:%02d:%02d",
    t.year, t.month, t.day, t.hour, t.minute, t.second)
print(stamp)
```

---

## `GetTimestamp`

```lua
utility.GetTimestamp() → int
```

Unix-таймштамп в секундах с 1970-01-01 UTC.

Проверенное живое значение: `1777159472` (апрель 2026).

```lua
local ts = utility.GetTimestamp()
file.append("events.log", ts .. " script_loaded\n")
```

---

## `GetFingerprint`

```lua
utility.GetFingerprint() → string
```

Хеш аппаратного отпечатка. Задумывался как стабильный идентификатор машины для лицензий или per-machine конфигов.

:::warning Возвращает пустую строку в этом билде
Три последовательных вызова вернули `""` (длина 0). Считай возврат потенциально пустым и имей fallback.
:::

```lua
local fp = utility.GetFingerprint()
if fp == nil or fp == "" then
    fp = "unknown-" .. tostring(utility.GetTimestamp())
end
print("HWID:", fp)
```

---

## `GetMousePos`

```lua
utility.GetMousePos() → table { [1] = x, [2] = y }
```

Текущая позиция мыши в пикселях экрана. Точка отсчёта - верхний левый угол, X растёт вправо, Y растёт вниз.

:::warning Возвращает одну array-table, а не multi-return
Функция возвращает одну table, ключи только целые `1` и `2`. Доступ через `mp[1]` и `mp[2]`. Сокращений `mp.X` / `mp.Y` **нет**, и table **не** разворачивается в `local x, y = ...` (получишь table в `x` и `nil` в `y`).
:::

Проверено вживую: вернула `{[1]=862, [2]=679}` когда курсор был в точке `(862, 679)`.

```lua
cheat.register("onPaint", function()
    local mp = utility.GetMousePos()
    local x, y = mp[1], mp[2]
    draw.Circle(x, y, 6, Color3.fromRGB(255, 255, 0), 1, 12, 1)
end)
```

---

## `MoveMouse`

```lua
utility.MoveMouse(dx: int, dy: int)
```

Двигает мышь на **относительное** смещение (не абсолютные координаты экрана). Положительный `dx` вправо, положительный `dy` вниз (та же ось что у `GetMousePos`). Используется внутренне в логике silent-aim и triggerbot.

```lua
utility.MoveMouse(5, -3)
```

:::warning Аргумент это НЕ raw screen-пиксели
Проверено вживую: старт `(972, 717)`, вызов `MoveMouse(30, 0)` сдвинул курсор в `(1010, 717)`, то есть **+38 px**, не +30. `MoveMouse(0, 25)` дал **+47 px** по вертикали. Offset проходит через Windows pointer ballistics (mouse acceleration) - нелинейный множитель зависящий от скорости и текущей OS-чувствительности.

Последствия:
- Наивный round-trip "двинули +N потом -N" **не** возвращает курсор в стартовую точку. Probe закончился drift'ом `(-22, 0)` после пары +30 / -30.
- Для aimbot или smooth-aim нужно либо калибровать множитель на каждой машине, либо звать `MoveMouse` маленькими шажками (1-3 unit), где ballistic-кривая ближе к линейной.
- Для тестов движения курсора сравнивай **направление** delta, а не магнитуду.
:::

:::warning Сайд-эффект
Реально двигает системный курсор. Никогда не вызывай из `onPaint`. Используй `onUpdate` с rate-limit'ом через паттерн троттла из `GetTickCount`.
:::

---

## `GetMenuState`

```lua
utility.GetMenuState() → bool
```

Возвращает `true` если меню Serotonin сейчас открыто (виден курсор). Используй для подавления aim/movement когда юзер взаимодействует с читом.

Проверено вживую: вернула `true` когда меню было открыто.

```lua
cheat.register("onUpdate", function()
    if utility.GetMenuState() then return end
end)
```

---

## `WorldToScreen`

```lua
utility.WorldToScreen(v3: Vector3) → screenX, screenY, onScreen: bool
```

Проецирует world-space `Vector3` в 2D-координаты экрана. Возвращает **три** значения: `screenX`, `screenY`, `bool`.

Проверено вживую с `Vector3.new(0, 10, 0)`:
```
screenX  = 1201.9686279297
screenY  = 410.52291870117
onScreen = true
select("#", utility.WorldToScreen(v3)) == 3
```

Валидация аргументов (проверено):

| Вызов | Результат |
|---|---|
| `WorldToScreen()`              | `"bad argument #1 to '?' (__vector3_meta expected, got no value)"` |
| `WorldToScreen(nil)`           | `"bad argument #1 to '?' (__vector3_meta expected, got nil)"` |
| `WorldToScreen({0,10,0})`      | `"bad argument #1 to '?' (__vector3_meta expected, got table)"` (нужен `Vector3` userdata, не plain table) |

:::info Что реально означает `onScreen`
`onScreen` равно `true` когда проекция математически валидна (точка перед камерой). Это **не** проверка "видно ли в окне", прогон с `Vector3.new(-99999, 50, -99999)` тоже вернул `true`. Для реальной проверки видимости дополнительно сверяй `0 <= screenX <= window_w` и `0 <= screenY <= window_h` через `cheat.GetWindowSize()`.
:::

```lua
cheat.register("onPaint", function()
    local lp = entity.GetLocalPlayer()
    if not lp then return end
    local pos = lp:GetBonePosition("HumanoidRootPart")
    if not pos then return end
    local x, y, onScreen = utility.WorldToScreen(pos)
    if onScreen then
        draw.TextOutlined("Я", x, y, Color3.fromRGB(0, 255, 0), "Verdana")
    end
end)
```

---

## `GetClipboard`

```lua
utility.GetClipboard() → string
```

Текущий системный буфер обмена как UTF-8 строка. Пустая строка если буфер пуст или содержит не-текст (картинку, файл, бинарь). Лимита по длине не наблюдалось.

Проверено вживую: вернула 159-символьную строку с ранее скопированным Lua-сниппетом.

```lua
local text = utility.GetClipboard()
print("длина буфера:", #text)
```

---

## `SetClipboard`

```lua
utility.SetClipboard(s: string)
```

Заменяет системный буфер обмена указанной строкой. Ничего не возвращает.

Проверено вживую полным round-trip: записал `"serotonin-test-1777160880"`, немедленный `GetClipboard()` вернул ровно ту же строку, потом восстановление оригинального 232-символьного значения тоже сработало. Латентности больше одного кадра не потребовалось.

```lua
local lp = entity.GetLocalPlayer()
if lp then
    utility.SetClipboard("UserId: " .. tostring(lp.UserId))
end
```

:::warning Сайд-эффект
Перезаписывает то что юзер скопировал. Чтобы вежливо, сохрани предыдущий буфер через `GetClipboard` и восстанови после.
:::

---

## `LoadImage`

```lua
utility.LoadImage(data: string) → number
```

Загружает raw байты изображения (PNG / JPG) и возвращает числовой texture id, пригодный для [`draw.Image`](./draw). Используй с [`file.read`](./file) для ассет-пайплайна.

Проверено вживую с PNG 21816 байт: первый вызов вернул id `1`, второй вызов `2`. **Каждый вызов выделяет новый texture handle**, функция не дедуплицирует. Грузи один раз на старте и переиспользуй id, не перегружай каждый кадр иначе утечка texture-памяти.

Битый ввод безопасно отвергается через `pcall`:
- мусорная строка возвращает error `"Failed to load texture from memory. HRESULT: 0x?"`
- не-string аргумент возвращает error `"bad argument #1 to '?' (string expected)"`
- native-крашей не наблюдалось

```lua
local data = file.read("logo.png")
if data then
    local tex = utility.LoadImage(data)
    cheat.register("onPaint", function()
        draw.Image(tex, 20, 20, 64, 64, Color3.new(1, 1, 1), 1)
    end)
end
```

Файл лежит в `C:\Serotonin\files\` (sandbox скрипта). Forward slashes в пути.

```lua
local data = file.read("logo.png")
if data then
    local tex = utility.LoadImage(data)
    cheat.register("onPaint", function()
        draw.Image(tex, 20, 20, 64, 64, Color3.new(1, 1, 1), 1)
    end)
end
```

Файл лежит в `C:\Serotonin\files\` (sandbox скрипта). Forward slashes в пути.

---

## `TeleportToPlace`

```lua
utility.TeleportToPlace(jobId: string)
```

Подключается к конкретному Roblox-серверу (game instance) по его **Job ID**, UUID идентификатору активного сервера в текущей игре. Это **не** "сменить игру", place остаётся прежним.

Реальная сигнатура восстановлена из runtime-error: вызов с `nil`, `bool` или `table` возвращает:
```
bad argument #1 to '?' (string Job ID expected)
```
Числа тоже принимаются (auto-coerce в string). Строковые аргументы не вызывают ошибку на месте, но если Job ID невалидный, чит всё равно может инициировать teleport-попытку которую Roblox client отвергнет, что выкинет тебя с текущего сервера.

Используй чтобы зайти к другу в его private-сервер или вернуться в тот же instance после disconnect:

```lua
local job_id = "сюда-настоящий-job-id"
utility.TeleportToPlace(job_id)
```

Job ID выглядит как `df93c2e8-7c18-4f3a-9d1e-9b8a5b2f4e3c` (стандартный UUID).

:::danger Сетевой сайд-эффект
Даже с невалидным Job ID чит может инициировать teleport-запрос который Roblox-сервер отвергнет на полпути. Это может крашнуть чит или кикнуть тебя с текущего сервера. Никогда не зови `TeleportToPlace` со случайными или угаданными строками, только с реальным Job ID который ты получил из `game.GetService("Players").LocalPlayer` или профиля друга.
:::

---

## Паттерны

### Счётчик FPS
См. [`GetDeltaTime`](#getdeltatime).

### Throttled-действие (каждые N мс)
См. [`GetTickCount`](#gettickcount).

### Сохранение состояния на машину
```lua
local fp = utility.GetFingerprint()
if fp == nil or fp == "" then fp = "anon" end
local path = "config_" .. string.sub(fp, 1, 8) .. ".json"
file.write(path, '{"theme":"dark"}')
```

### Пропуск логики когда меню открыто
```lua
cheat.register("onUpdate", function()
    if utility.GetMenuState() then return end
end)
```

### Правильное чтение позиции мыши
```lua
local mp = utility.GetMousePos()
local mx, my = mp[1], mp[2]
```
