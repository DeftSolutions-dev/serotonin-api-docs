---
sidebar_position: 12
title: http
---

# `http`

Asynchronous HTTPS client. 2 canonical functions, single-word verb form (PascalCase + lowercase).

| | |
|---|---|
| **Functions** | 2 (4 with aliases) |
| **Verified live** | 2 of 2 |
| **Required event context** | none for the call itself; the callback fires later on the cheat's IO thread |
| **Side effects** | sends a network request from the user's IP |
| **Protocol** | HTTPS verified live, plain HTTP not tested |

> **Aliases.** Two-form (PascalCase + lowercase): `http.Get` / `http.get`, `http.Post` / `http.post`. See [Overview / Naming convention](../overview#naming-convention).

> **Async, fire-and-forget.** `Get` and `Post` return `nil` immediately. The response is delivered via the callback on a later cheat tick. There is no synchronous variant.

> **No status code, no response headers.** The callback receives a single argument: the response body as a Lua string. There is no way to read the HTTP status, content-type, or response headers from inside the callback.

## Quick reference

| Function | Signature | Notes | Status |
|---|---|---|---|
| [`Get`](#get)   | `(url: string, headers: table, callback: fn(body: string))` | all 3 args required, body delivered to callback | <span className="status-badge verified">verified</span> |
| [`Post`](#post) | `(url: string, headers: table, body: string, callback: fn(body: string))` | all 4 args required | <span className="status-badge verified">verified</span> |

---

## `Get`

```lua
http.Get(url: string, headers: table, callback: function)
```

Sends an HTTPS GET. **All three arguments are required**, including an empty headers table `{}`. The callback receives a single argument: the response body as a Lua string.

Verified live argument validation:

| Call | Result |
|---|---|
| `Get()`              | `"bad argument #1 to '?' (string expected, got no value)"` |
| `Get(url)`           | `"bad argument #2 to '?' (table expected, got no value)"` |
| `Get(url, {})`       | `"bad argument #3 to '?' (function expected, got no value)"` |
| `Get(url, {}, fn)`   | returns `nil`, callback fires later |

### Headers

The headers argument is a string-to-string Lua table. Keys are header names, values are header values. Verified live: `Get("https://httpbin.org/headers", {["X-Verify-Probe"]="serotonin-test"}, cb)` echoes `X-Verify-Probe: serotonin-test` back inside the response body. Use `{}` for no custom headers.

```lua
http.Get("https://api.example.com/v1/status", {
    ["Authorization"] = "Bearer " .. token,
    ["X-Client"]      = "mtc-script",
}, function(body)
    print(body and #body or "no response")
end)
```

### Status codes and errors

The callback **only receives the body string**. It cannot tell you the HTTP status or response headers.

Verified live behaviors:

| Server response | Callback gets |
|---|---|
| `200 OK` with body                      | the body as a string |
| `404 Not Found` with empty body         | empty string `""` |
| Bad host / DNS failure / network error  | **callback NEVER fires** (silently dropped, even after 30+ seconds) |

:::warning Implement your own timeout
Network-level failures (unreachable host, DNS failure, TLS error) drop the request silently with no callback invocation. If your code waits for a response, add a deadline:

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

Sends an HTTPS POST with a string body. **All four arguments are required**.

Verified live argument validation:

| Call | Result |
|---|---|
| `Post()`              | `"bad argument #1 to '?' (string expected, got no value)"` |
| `Post(url)`           | `"bad argument #2 to '?' (table expected, got no value)"` |

### Body and Content-Type

The body is sent verbatim. **Set `Content-Type` yourself** through the headers table; without it, servers may interpret the body as `application/x-www-form-urlencoded` by default.

Verified live with `httpbin.org/post`:

| Call | Server saw |
|---|---|
| `Post(url, {["Content-Type"]="application/json"}, '{"k":1}', cb)` | `Content-Type: application/json`, body echoed as JSON |
| `Post(url, {}, "raw_body_text", cb)` | server defaulted to `application/x-www-form-urlencoded`, body parsed as form |

```lua
local body = '{"event":"hit","ts":' .. utility.GetTickCount() .. '}'

http.Post("https://your-server/log", {
    ["Content-Type"]   = "application/json",
    ["Authorization"]  = "Bearer " .. token,
}, body, function(resp)

end)
```

### Same status / error pattern as Get

Network-level errors silently drop the callback, see [`Get` warning](#status-codes-and-errors). 404 / 500 / etc. fire the callback with whatever body the server returned (often empty).

---

## Patterns

### Wrap with timeout
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

### POST with retry
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

### Stream telemetry
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

### Download a WAV and play it
```lua
http.Get("https://your-cdn/hit.wav", {}, function(body)
    if body and #body > 44 and body:sub(1, 4) == "RIFF" then
        audio.PlaySound(body, false, 1.0, 1.0)
    end
end)
```
