---
sidebar_position: 10
title: mouse
---

# `mouse`

Synthetic mouse input + click-state read. 5 canonical functions.

| | |
|---|---|
| **Functions** | 5 (11 with aliases) |
| **Verified live** | 5 of 5 |
| **Required event context** | none |
| **Side effects** | `Click`, `Press`, `Release`, `Scroll` inject OS-level mouse input that the game and the OS see as real |

> **Aliases.** `Click`, `Press`, `Release`, `Scroll` each have **two** forms (PascalCase + lowercase). `IsClicked` has **three** forms (PascalCase / camelCase / snake_case). See [Overview / Naming convention](../overview#naming-convention).

> **Cursor query.** This library has no `GetPos` / `SetPos`. Use [`utility.GetMousePos`](./utility#getmousepos) and [`utility.MoveMouse`](./utility#movemouse) for cursor coordinates.

## Button identifiers, two different schemes

The cheat splits mouse-button arguments into **two registries**, with **different accepted values**. This was verified live: passing the wrong identifier to the wrong function gives a clear error.

### `IsClicked` registry, read-only state probe

| Form | Notes |
|---|---|
| `"left"`, `"LEFT"`, `"Left"`     | case-insensitive |
| `"right"`                        | |
| `"mouse4"`                       | side X1 button |
| `"mouse5"`                       | side X2 button |
| `0`, `1`, `2`                    | numeric, internal mapping |
| `"middle"`                       | ❌ not supported, use VK code `4` and the bool from a workaround |
| any other string                 | ❌ raises `"Unknown key or button name: '<lowercased>'"` |

### `Click` / `Press` / `Release` registry, synthetic input

This API does **not** accept the friendly `"left"` / `"right"` strings even though they are in the lookup table. It accepts only:

| Form | Maps to | Verified |
|---|---|---|
| `1` | `VK_LBUTTON` (left)   | ✅ |
| `2` | `VK_RBUTTON` (right)  | ✅ |
| `4` | `VK_MBUTTON` (middle) | ✅ |
| `5` | `VK_XBUTTON1` (= `"mouse4"`) | ✅ |
| `6` | `VK_XBUTTON2` (= `"mouse5"`) | ✅ |
| `"mouse4"`        | side X1 button | ✅ |
| `"mouse5"`        | side X2 button | ✅ |
| `"left"` / `"right"` | ❌ `"Invalid mouse button specified for Press"` (or `Click` / `Release` depending on the call) |
| `0`, `3`            | ❌ `"Invalid mouse button specified for ..."` |
| `"middle"`, `"lbutton"`, `"LMB"`, `"button1"`, etc. | ❌ `"Unknown key or button name: '<lowercased>'"` |

Recommended pattern, define the constants once and use them everywhere:

```lua
local MOUSE = {
    LEFT   = 1,
    RIGHT  = 2,
    MIDDLE = 4,
    X1     = 5,
    X2     = 6,
}

mouse.Click(MOUSE.LEFT)
if mouse.IsClicked("left") then ... end
```

## Quick reference

| Function | Signature | Notes | Status |
|---|---|---|---|
| [`Click`](#click)        | `(button: number \| "mouse4" \| "mouse5")` | press + release in one call (synthetic input) | <span className="status-badge verified">verified</span> |
| [`Press`](#press--release)  | `(button: number \| "mouse4" \| "mouse5")` | press the button, leave it held                | <span className="status-badge verified">verified</span> |
| [`Release`](#press--release) | `(button: number \| "mouse4" \| "mouse5")` | release a previously pressed button            | <span className="status-badge verified">verified</span> |
| [`Scroll`](#scroll)      | `(amount: number)`           | wheel scroll, positive = up                    | <span className="status-badge verified">verified</span> |
| [`IsClicked`](#isclicked) | `(button: string \| number) → bool` | true while the button is currently held | <span className="status-badge verified">verified</span> |

---

## `IsClicked`

```lua
mouse.IsClicked(button: string | number) → bool
```

Returns `true` while the named button is currently held.

Verified live with the [IsClicked registry](#isclicked-registry-read-only-state-probe) above.

```lua
cheat.Register("onUpdate", function()
    if mouse.IsClicked("left") then

    end
end)
```

---

## `Click`

```lua
mouse.Click(button: number | "mouse4" | "mouse5", delay_ms?: number)
```

Synthesizes a press-and-release of the named button. Optional `delay_ms` inserts a delay between the press and release halves (default ~0). Verified live: `mouse.Click(1)` produces an LMB click that downstream applications see as real.

```lua
mouse.Click(1)
mouse.Click(2)
mouse.Click(4)
mouse.Click("mouse4")
mouse.Click(1, 50)
```

:::warning OS-level input
This call goes through Windows synthetic-input APIs. The click is delivered to whichever window has focus, **including non-Roblox windows**. Make sure Roblox is the focused window before calling, or guard with [`utility.GetMenuState`](./utility#getmenustate).
:::

---

## `Press` / `Release`

```lua
mouse.Press(button: number | "mouse4" | "mouse5")
mouse.Release(button: number | "mouse4" | "mouse5")
```

`Press` holds the button down, `Release` lifts it. **Always pair them**, otherwise the button stays held until the next real OS event clears it. Verified live with both `Press(1)` / `Release(1)`, observable through `IsClicked("left")` becoming `true` between the two calls.

```lua

mouse.Press(2)

mouse.Release(2)
```

---

## `Scroll`

```lua
mouse.Scroll(amount: number)
```

Synthetic wheel scroll. Positive `amount` typically scrolls up, negative down. Verified live: `Scroll(120)`, `Scroll(-120)`, `Scroll(0)` all return `nil` cleanly. Magnitude follows OS wheel-delta convention (a single notch is usually `120`, but per-application interpretation varies).

```lua
mouse.Scroll(120)
mouse.Scroll(-360)
```

| Call | Result |
|---|---|
| `Scroll()`     | `"bad argument #1 to '?' (number expected, got no value)"` |
| `Scroll(nil)`  | `"bad argument #1 to '?' (number expected, got nil)"` |
| `Scroll("s")`  | `"bad argument #1 to '?' (number expected, got string)"` |

---

## Patterns

### Hold LMB while target is in crosshair
```lua
local was_holding = false

cheat.Register("onUpdate", function()
    local target = entity.GetTarget()
    local should_hold = target ~= nil and target.IsAlive

    if should_hold and not was_holding then
        mouse.Press(1)
        was_holding = true
    elseif not should_hold and was_holding then
        mouse.Release(1)
        was_holding = false
    end
end)

cheat.Register("shutdown", function()
    if was_holding then mouse.Release(1) end
end)
```

### Triggerbot with cooldown
```lua
local last_click = 0

cheat.Register("onUpdate", function()
    local target = entity.GetTarget()
    if not target or not target.IsAlive then return end

    local now = utility.GetTickCount()
    if now - last_click > 200 then
        mouse.Click(1)
        last_click = now
    end
end)
```

### Side-button hotkey via IsClicked
```lua
cheat.Register("onUpdate", function()
    if mouse.IsClicked("mouse4") then

    end
end)
```

### Map friendly names yourself
```lua
local MOUSE = { LEFT = 1, RIGHT = 2, MIDDLE = 4, X1 = 5, X2 = 6 }

local function click(name)
    mouse.Click(MOUSE[name:upper()] or error("unknown: "..name))
end

click("left"); click("right"); click("middle")
```
