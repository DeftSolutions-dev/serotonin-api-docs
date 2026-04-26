---
sidebar_position: 12
title: http
---

# `http`

Асинхронный HTTPS клиент. 2 канонические функции, single-word verb форма (PascalCase + lowercase).

| | |
|---|---|
| **Функций** | 2 (4 с алиасами) |
| **Проверено вживую** | 2 из 2 |
| **Требуемый event** | нет для самого вызова, callback срабатывает позже на IO-потоке чита |
| **Сайд-эффекты** | отправляет сетевой запрос с IP пользователя |
| **Протокол** | HTTPS проверен вживую, plain HTTP не тестирован |

> **Алиасы.** Two-form (PascalCase + lowercase): `http.Get` / `http.get`, `http.Post` / `http.post`. См. [Обзор / Конвенция именования](../overview#конвенция-именования).

> **Async, fire-and-forget.** `Get` и `Post` сразу возвращают `nil`. Ответ доставляется через callback на следующем тике чита. Синхронного варианта нет.

> **Нет status code, нет response headers.** Callback получает один аргумент: response body как Lua-строку. Невозможно прочитать HTTP-статус, content-type или response headers изнутри callback.

## Краткий справочник

| Функция | Сигнатура | Заметка | Статус |
|---|---|---|---|
| [`Get`](#get)   | `(url: string, headers: table, callback: fn(body: string))` | все 3 аргумента обязательны, body доставляется в callback | <span className="status-badge verified">проверено</span> |
| [`Post`](#post) | `(url: string, headers: table, body: string, callback: fn(body: string))` | все 4 аргумента обязательны | <span className="status-badge verified">проверено</span> |

---

## `Get`

```lua
http.Get(url: string, headers: table, callback: function)
```

Отправляет HTTPS GET. **Все три аргумента обязательны**, включая пустую headers-таблицу `{}`. Callback получает один аргумент: response body как Lua-строку.

Проверенная валидация аргументов:

| Вызов | Результат |
|---|---|
| `Get()`              | `"bad argument #1 to '?' (string expected, got no value)"` |
| `Get(url)`           | `"bad argument #2 to '?' (table expected, got no value)"` |
| `Get(url, {})`       | `"bad argument #3 to '?' (function expected, got no value)"` |
| `Get(url, {}, fn)`   | возвращает `nil`, callback срабатывает позже |

### Headers

Headers-аргумент это string-to-string Lua-таблица. Ключи это header-имена, значения это header-значения. Проверено вживую: `Get("https://httpbin.org/headers", {["X-Verify-Probe"]="serotonin-test"}, cb)` echoes `X-Verify-Probe: serotonin-test` назад в response body. Используй `{}` если custom headers не нужны.

```lua
http.Get("https://api.example.com/v1/status", {
    ["Authorization"] = "Bearer " .. token,
    ["X-Client"]      = "mtc-script",
}, function(body)
    print(body and #body or "no response")
end)
```

### Status codes и ошибки

Callback получает **только body-строку**. Он не может сказать тебе HTTP-статус или response headers.

Проверенные поведения:

| Server response | Callback получает |
|---|---|
| `200 OK` с body                          | body как строку |
| `404 Not Found` с пустым body            | пустую строку `""` |
| Bad host / DNS failure / network error   | **callback НИКОГДА не срабатывает** (silently dropped, даже после 30+ секунд) |

:::warning Имплементируй свой timeout
Сетевые ошибки (unreachable host, DNS failure, TLS error) тихо дропают запрос без вызова callback. Если твой код ждёт ответ, добавь deadline:

```lua
local fired = false
local deadline = utility.GetTickCount() + 5000

http.Get(url, {}, function(body)
    fired = true
    handle(body)
end)

cheat.Register("onUpdate", function()
    if not fired and utility.GetTickCount() > deadline then
        fired = true
        handle(nil)
    end
end)
```
:::

---

## `Post`

```lua
http.Post(url: string, headers: table, body: string, callback: function)
```

Отправляет HTTPS POST со string-body. **Все четыре аргумента обязательны**.

Проверенная валидация аргументов:

| Вызов | Результат |
|---|---|
| `Post()`              | `"bad argument #1 to '?' (string expected, got no value)"` |
| `Post(url)`           | `"bad argument #2 to '?' (table expected, got no value)"` |

### Body и Content-Type

Body отправляется как есть. **Устанавливай `Content-Type` сам** через headers-таблицу. Без него серверы могут интерпретировать body как `application/x-www-form-urlencoded` по умолчанию.

Проверено вживую с `httpbin.org/post`:

| Вызов | Сервер увидел |
|---|---|
| `Post(url, {["Content-Type"]="application/json"}, '{"k":1}', cb)` | `Content-Type: application/json`, body echoed как JSON |
| `Post(url, {}, "raw_body_text", cb)` | сервер дефолтнул в `application/x-www-form-urlencoded`, body распарсен как form |

```lua
local body = '{"event":"hit","ts":' .. utility.GetTickCount() .. '}'

http.Post("https://your-server/log", {
    ["Content-Type"]   = "application/json",
    ["Authorization"]  = "Bearer " .. token,
}, body, function(resp)

end)
```

### Тот же status / error паттерн что у Get

Сетевые ошибки тихо дропают callback, см. [`Get` warning](#status-codes-и-ошибки). 404 / 500 / и т.д. срабатывают callback с тем body что вернул сервер (часто пустой).

---

## Паттерны

### Wrap с timeout
```lua
local function http_get_with_timeout(url, timeout_ms, on_done)
    local fired = false
    local deadline = utility.GetTickCount() + timeout_ms
    http.Get(url, {}, function(body)
        if fired then return end
        fired = true
        on_done(body)
    end)
    cheat.Register("onUpdate", function()
        if not fired and utility.GetTickCount() > deadline then
            fired = true
            on_done(nil)
        end
    end)
end

http_get_with_timeout("https://api.example.com/version", 3000, function(body)
    if body then
        print("server says:", body)
    else
        print("timeout")
    end
end)
```

### POST с retry
```lua
local function post_with_retry(url, body, attempts_left)
    http.Post(url, {["Content-Type"]="application/json"}, body, function(resp)
        if resp and #resp > 0 then

        elseif attempts_left > 0 then
            post_with_retry(url, body, attempts_left - 1)
        end
    end)
end

post_with_retry("https://your-server/event", '{"k":"v"}', 3)
```

### Стримить телеметрию
```lua
local QUEUE = {}

cheat.Register("onSlowUpdate", function()
    if #QUEUE == 0 then return end
    local payload = table.concat(QUEUE, "\n")
    QUEUE = {}
    http.Post("https://your-server/telemetry",
        {["Content-Type"]="text/plain"}, payload, function() end)
end)

local function log_event(line)
    QUEUE[#QUEUE + 1] = string.format("[%d] %s",
        utility.GetTickCount(), line)
end
```

### Скачать WAV и проиграть его
```lua
http.Get("https://your-cdn/hit.wav", {}, function(body)
    if body and #body > 44 and body:sub(1, 4) == "RIFF" then
        audio.PlaySound(body, false, 1.0, 1.0)
    end
end)
```
