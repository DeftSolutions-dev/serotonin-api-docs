---
sidebar_position: 13
title: websocket
---

# `websocket`

Asynchronous WebSocket client. 3 canonical functions, single-word verb form (PascalCase + lowercase).

| | |
|---|---|
| **Functions** | 3 (6 with aliases) |
| **Verified live** | 3 of 3 (signatures + `onError` event observed; full message roundtrip not achieved in our run, see notes) |
| **Required event context** | none for the call itself; callbacks fire later on the cheat's IO thread |
| **Side effects** | opens an outbound TCP/TLS connection from the user's IP, holds it open until `Close` |

> **Aliases.** Two-form (PascalCase + lowercase): `websocket.Connect` / `websocket.connect`, etc. See [Overview / Naming convention](../overview#naming-convention).

> **Callback table uses camelCase.** Verified live: only `onMessage`/`onOpen`/`onClose`/`onError` keys are dispatched. PascalCase (`OnError`) and snake_case (`on_error`) tables registered alongside the same connection received zero events.

## Quick reference

| Function | Signature | Notes | Status |
|---|---|---|---|
| [`Connect`](#connect) | `(url: string, callbacks: table) → id: number` | both args required, returns sequential numeric id even on bad URL (failure surfaces async via `onError`) | <span className="status-badge verified">verified</span> |
| [`Send`](#send)       | `(id: number, data: string)` | both args required, succeeds (returns `nil`) regardless of whether the connection is open yet | <span className="status-badge verified">verified</span> |
| [`Close`](#close)     | `(id: number)` | silently no-ops on unknown ids, returns `nil` | <span className="status-badge verified">verified</span> |

---

## Callback table

Pass a table of named functions as the second argument to `Connect`. The cheat looks up the keys in **camelCase only**:

| Key | When it fires | Argument |
|---|---|---|
| `onOpen`    | when the connection has been established                        | none documented |
| `onMessage` | when the server sends a message                                  | the message data as string (signature inferred, not roundtripped in our run) |
| `onClose`   | when the connection terminates cleanly                           | none documented |
| `onError`   | when the connection fails to establish or terminates abnormally  | error string (verified: `"Underlying Transport Error"` was delivered to `onError(msg)`) |

Verified by registering the same connection with three callback tables in PascalCase, camelCase, and snake_case naming styles. Only the camelCase table received the `onError` event. The PascalCase and snake_case tables received nothing.

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

Opens a WebSocket connection to `url`. **Both arguments are required.** Returns a numeric id used to address the connection in `Send` and `Close`.

The id is assigned **sequentially** by the cheat. In our run, four `Connect` calls returned `1, 2, 3, 4`.

Verified arg validation:

| Call | Result |
|---|---|
| `Connect()`                      | `"bad argument #1 to '?' (string expected, got no value)"` |
| `Connect("wss://...")`           | `"bad argument #2 to '?' (table expected, got no value)"` |
| `Connect("wss://invalid-host.invalid", {})` | sync `ok = true`, returns id `1`. Async: `onError("Underlying Transport Error")` fires later |

Network failure is **always asynchronous**. `Connect` returns an id even if the URL is unreachable; the failure is delivered through `onError`.

### Successful connect example

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

Sends `data` to the connection identified by `id`. Both arguments required.

Verified arg validation:

| Call | Result |
|---|---|
| `Send()`           | `"bad argument #1 to '?' (number expected, got no value)"` |
| `Send(id)`         | `"bad argument #2 to '?' (string expected, got no value)"` |
| `Send(id, "hi")`   | returns `nil`, accepted regardless of connection state |

`Send` returns `nil` even when the connection is not yet open or has already failed. There is no synchronous indicator that the message reached the wire. The only signal of failure is a later `onError` callback.

```lua
websocket.Send(id, "ping")
websocket.Send(id, '{"event":"hit","ts":' .. utility.GetTickCount() .. '}')
```

For binary frames, pass any Lua string. The `buffer` library is **not bound** in the current build (LuaJIT 2.0.3 lacks `string.buffer`), so build the bytes manually with `string.char` or `string.format`:

```lua
local payload = string.char(0xDE, 0xAD, 0xBE, 0xEF, 0xCA, 0xFE, 0xBA, 0xBE)
websocket.Send(id, payload)
```

---

## `Close`

```lua
websocket.Close(id: number)
```

Closes the connection identified by `id`. Returns `nil`. Silently no-ops on unknown ids:

| Call | Result |
|---|---|
| `Close()`         | `"bad argument #1 to '?' (number expected, got no value)"` |
| `Close(9999)`     | `nil` (no error, no callback fires) |
| `Close(valid_id)` | `nil`, `onClose` fires later |

```lua
cheat.Register("shutdown", function()
    if my_ws_id then websocket.Close(my_ws_id) end
end)
```

---

## Patterns

### Reconnect with backoff
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

### Send queue with batching
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
