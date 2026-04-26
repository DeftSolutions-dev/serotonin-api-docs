---
sidebar_position: 13
title: websocket
---

# `websocket`

Асинхронный WebSocket клиент. 3 канонические функции, single-word verb форма (PascalCase + lowercase).

| | |
|---|---|
| **Функций** | 3 (6 с алиасами) |
| **Проверено вживую** | 3 из 3 (сигнатуры + `onError` event наблюдаемы; полный roundtrip сообщения не достигнут в нашем прогоне, см. ниже) |
| **Требуемый event** | нет для самого вызова, callback'и срабатывают позже на IO-потоке чита |
| **Сайд-эффекты** | открывает исходящее TCP/TLS соединение с IP пользователя, держит открытым до `Close` |

> **Алиасы.** Two-form (PascalCase + lowercase): `websocket.Connect` / `websocket.connect` и т.д. См. [Обзор / Конвенция именования](../overview#конвенция-именования).

> **Callback таблица использует camelCase.** Проверено вживую: только ключи `onMessage`/`onOpen`/`onClose`/`onError` диспатчатся. PascalCase (`OnError`) и snake_case (`on_error`) таблицы зарегистрированные на том же соединении получили ноль событий.

## Краткий справочник

| Функция | Сигнатура | Заметка | Статус |
|---|---|---|---|
| [`Connect`](#connect) | `(url: string, callbacks: table) → id: number` | оба аргумента обязательны, возвращает sequential numeric id даже на bad URL (failure через async `onError`) | <span className="status-badge verified">проверено</span> |
| [`Send`](#send)       | `(id: number, data: string)` | оба обязательны, succeeds (возвращает `nil`) независимо от того открыто ли соединение | <span className="status-badge verified">проверено</span> |
| [`Close`](#close)     | `(id: number)` | silently no-ops на unknown ids, возвращает `nil` | <span className="status-badge verified">проверено</span> |

---

## Callback таблица

Передай таблицу именованных функций как второй аргумент `Connect`. Чит ищет ключи **только в camelCase**:

| Ключ | Когда срабатывает | Аргумент |
|---|---|---|
| `onOpen`    | когда соединение установлено                                        | не задокументирован |
| `onMessage` | когда сервер шлёт сообщение                                         | данные сообщения как строка (сигнатура inferred, не roundtripped в нашем прогоне) |
| `onClose`   | когда соединение завершилось чисто                                  | не задокументирован |
| `onError`   | когда соединение не установилось или прервалось аномально           | строка ошибки (проверено: `"Underlying Transport Error"` доставлен в `onError(msg)`) |

Проверено регистрацией одного соединения с тремя callback-таблицами в стилях PascalCase, camelCase и snake_case. Только camelCase-таблица получила `onError` событие. PascalCase и snake_case получили ничего.

```lua
local function on_open()         print("ws connected") end
local function on_message(msg)   print("ws got:", msg) end
local function on_close()        print("ws closed") end
local function on_error(err)     print("ws error:", err) end

local id = websocket.Connect("wss://echo.example.com", {
    onOpen    = on_open,
    onMessage = on_message,
    onClose   = on_close,
    onError   = on_error,
})
```

---

## `Connect`

```lua
websocket.Connect(url: string, callbacks: table) → id: number
```

Открывает WebSocket соединение с `url`. **Оба аргумента обязательны.** Возвращает numeric id используемый для адресации соединения в `Send` и `Close`.

Id назначается **последовательно** читом. В нашем прогоне четыре `Connect` вызова вернули `1, 2, 3, 4`.

Проверенная валидация:

| Вызов | Результат |
|---|---|
| `Connect()`                      | `"bad argument #1 to '?' (string expected, got no value)"` |
| `Connect("wss://...")`           | `"bad argument #2 to '?' (table expected, got no value)"` |
| `Connect("wss://invalid-host.invalid", {})` | sync `ok = true`, возвращает id `1`. Async: `onError("Underlying Transport Error")` срабатывает позже |

Сетевая ошибка **всегда асинхронна**. `Connect` возвращает id даже если URL недостижим; failure доставляется через `onError`.

### Пример успешного connect

```lua
local function on_message(msg) print("server:", msg) end
local function on_open()       websocket.Send(my_id, "hello") end
local function on_close()      print("closed") end
local function on_error(err)   print("error:", err) end

local id = websocket.Connect("wss://your-server/socket", {
    onOpen    = on_open,
    onMessage = on_message,
    onClose   = on_close,
    onError   = on_error,
})
```

---

## `Send`

```lua
websocket.Send(id: number, data: string)
```

Отправляет `data` в соединение `id`. Оба аргумента обязательны.

Проверенная валидация:

| Вызов | Результат |
|---|---|
| `Send()`           | `"bad argument #1 to '?' (number expected, got no value)"` |
| `Send(id)`         | `"bad argument #2 to '?' (string expected, got no value)"` |
| `Send(id, "hi")`   | возвращает `nil`, принят независимо от состояния соединения |

`Send` возвращает `nil` даже когда соединение ещё не открыто или уже упало. Нет синхронного индикатора что сообщение дошло до wire. Единственный сигнал failure это поздний `onError` callback.

```lua
websocket.Send(id, "ping")
websocket.Send(id, '{"event":"hit","ts":' .. utility.GetTickCount() .. '}')
```

Для binary frames передавай любую Lua-строку. Библиотека `buffer` в текущем билде **не привязана** (LuaJIT 2.0.3 не имеет `string.buffer`), так что собирай байты вручную через `string.char` / `string.format`:

```lua
local payload = string.char(0xDE, 0xAD, 0xBE, 0xEF, 0xCA, 0xFE, 0xBA, 0xBE)
websocket.Send(id, payload)
```

---

## `Close`

```lua
websocket.Close(id: number)
```

Закрывает соединение `id`. Возвращает `nil`. Silently no-ops на unknown ids:

| Вызов | Результат |
|---|---|
| `Close()`         | `"bad argument #1 to '?' (number expected, got no value)"` |
| `Close(9999)`     | `nil` (без error, callback не срабатывает) |
| `Close(valid_id)` | `nil`, `onClose` срабатывает позже |

```lua
cheat.Register("shutdown", function()
    if my_ws_id then websocket.Close(my_ws_id) end
end)
```

---

## Паттерны

### Reconnect с backoff
```lua
local current_id = nil
local backoff_ms = 500

local function open(url)
    current_id = websocket.Connect(url, {
        onOpen = function()
            backoff_ms = 500
            print("ws open")
        end,
        onMessage = function(msg) handle(msg) end,
        onError   = function(err)
            print("ws error:", err)

            local target = utility.GetTickCount() + backoff_ms
            backoff_ms = math.min(backoff_ms * 2, 30000)
            cheat.Register("onUpdate", function()
                if utility.GetTickCount() >= target then
                    open(url)
                end
            end)
        end,
        onClose = function() print("ws closed") end,
    })
end

open("wss://your-server/socket")
```

### Send-очередь с батчингом
```lua
local id, queue, sending = nil, {}, false

local function flush()
    if not sending and #queue > 0 then
        for _, item in ipairs(queue) do websocket.Send(id, item) end
        queue = {}
    end
end

id = websocket.Connect("wss://your-server/events", {
    onOpen    = function() sending = false; flush() end,
    onMessage = function(msg) print(msg) end,
    onError   = function(err) sending = true end,
    onClose   = function() sending = true end,
})

local function send(s)
    queue[#queue + 1] = s
    flush()
end
```

### Per-frame heartbeat
```lua
local id = websocket.Connect("wss://your-server/socket", { onMessage = function() end })
local last_ping = 0

cheat.Register("onUpdate", function()
    local now = utility.GetTickCount()
    if now - last_ping > 10000 then
        websocket.Send(id, "ping")
        last_ping = now
    end
end)
```
