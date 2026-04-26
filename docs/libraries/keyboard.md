---
sidebar_position: 11
title: keyboard
---

# `keyboard`

Synthetic keyboard input + key-state read. 4 canonical functions.

| | |
|---|---|
| **Functions** | 4 (9 with aliases) |
| **Verified live** | 4 of 4 |
| **Required event context** | none |
| **Side effects** | `Click`, `Press`, `Release` inject OS-level keystrokes that the game and the OS see as real |

> **Aliases.** `Click`, `Press`, `Release` each have **two** forms (PascalCase + lowercase). `IsPressed` has **three** forms. See [Overview / Naming convention](../overview#naming-convention).

## Key names

`IsPressed` (and the other functions, by convention) accept these forms, **case-insensitive** for letters and key names:

### Verified accepted

| Form | Example | Meaning |
|---|---|---|
| Single letter         | `"A"`, `"a"`            | the matching letter key (Roblox / Win32 VK) |
| Single digit          | `"1"`, `"5"`            | top-row digit |
| Function key          | `"F1"`, `"F12"`         | F-row |
| Named special key     | `"Space"`               | spacebar |
| Named special key     | `"Enter"`               | return / enter |
| Named special key     | `"Escape"`              | escape |
| Modifier (no L/R)     | `"Shift"`, `"Ctrl"`, `"Alt"` | any side, the cheat does not distinguish left/right |
| Windows VK code (number) | `0x41` (`= 65`)        | `VK_A` |
| Windows VK code (number) | `0x20`                 | `VK_SPACE` |
| Windows VK code (number) | `0x1B`                 | `VK_ESCAPE` |

### Verified rejected (`Unknown key or button name: '<lowercased>'`)

| Form | Use instead |
|---|---|
| `"Return"`        | `"Enter"`     |
| `"Esc"`           | `"Escape"`    |
| `"LeftShift"`, `"RightShift"`     | `"Shift"`     |
| `"LeftControl"`, `"RightControl"` | `"Ctrl"`      |
| `"LeftAlt"`, `"RightAlt"`         | `"Alt"`       |
| `" "` (single space char)         | `"Space"`     |

The cheat normalizes the input to lowercase before lookup (verified: `"LeftShift"` errors as `"'leftshift'"`).

## Quick reference

| Function | Signature | Notes | Status |
|---|---|---|---|
| [`Click`](#click)        | `(key: string \| number)` | press + release in one call (synthetic) | <span className="status-badge verified">verified</span> |
| [`Press`](#press--release)  | `(key: string \| number)` | press, leave held | <span className="status-badge verified">verified</span> |
| [`Release`](#press--release) | `(key: string \| number)` | release | <span className="status-badge verified">verified</span> |
| [`IsPressed`](#ispressed) | `(key: string \| number) → bool` | true while the key is currently held | <span className="status-badge verified">verified</span> |

All 4 functions verified live. `Press("Shift")` followed by `Release("Shift")` was confirmed observable through `IsPressed("Shift")` which read `true` between the two calls and `false` after.

---

## `IsPressed`

```lua
keyboard.IsPressed(key: string | number) → bool
```

Returns `true` while the named key is currently held.

Verified live (returned `bool` cleanly):

`"A"`, `"a"`, `"1"`, `"Space"`, `"Enter"`, `"Escape"`, `"Shift"`, `"Ctrl"`, `"Alt"`, `"F1"`, `"F12"`, `0x41`, `65`, `0x20`, `0x1B`.

Verified rejected:

| Call | Result |
|---|---|
| `IsPressed("Return")`        | `"Unknown key or button name: 'return'"` |
| `IsPressed("Esc")`           | `"Unknown key or button name: 'esc'"` |
| `IsPressed("LeftShift")`     | `"Unknown key or button name: 'leftshift'"` |
| `IsPressed("LeftControl")`   | `"Unknown key or button name: 'leftcontrol'"` |
| `IsPressed("LeftAlt")`       | `"Unknown key or button name: 'leftalt'"` |
| `IsPressed(" ")`             | `"Unknown key or button name: ' '"` |
| `IsPressed("garbage_key")`   | `"Unknown key or button name: 'garbage_key'"` |
| `IsPressed()`                | `"bad argument #1 to '?' (string expected, got no value)"` |
| `IsPressed(nil)`             | `"bad argument #1 to '?' (string expected, got nil)"` |

```lua
cheat.Register("onUpdate", function()
    if keyboard.IsPressed("Shift") and keyboard.IsPressed("E") then

    end
end)
```

---

## `Click`

```lua
keyboard.Click(key: string | number)
```

Synthetic press-and-release of the named key. Verified live with `keyboard.Click("Shift")` (`ok=true`, `ret=nil`, the modifier was momentarily pressed and released).

```lua
keyboard.Click("Space")
```

:::warning OS-level input
This call goes through Windows synthetic-input APIs. The keystroke is delivered to whichever window has focus, **including non-Roblox windows**. Make sure Roblox is the focused window before calling, or guard with [`utility.GetMenuState`](./utility#getmenustate).
:::

---

## `Press` / `Release`

```lua
keyboard.Press(key: string | number, delay_ms?: number)
keyboard.Release(key: string | number)
```

`Press` holds the key down, `Release` lifts it. **Always pair them**, otherwise the key stays held until the next real OS event clears it. Optional `delay_ms` on `Press` releases the key automatically after that many milliseconds (`keyboard.Press("W", 100)` is equivalent to `Press` + 100ms wait + `Release`).

Verified live: `keyboard.Press("Shift")` followed by a 5 ms delay and `keyboard.Release("Shift")` was observable through `keyboard.IsPressed("Shift")`:
- before: `false`
- after `Press`: `true`
- after `Release`: `false`

```lua

keyboard.Press("W")

keyboard.Release("W")
```

---

## Patterns

### Hold W while target is in front
```lua
local was_holding = false

cheat.Register("onUpdate", function()
    local target = entity.GetTarget()
    local should_hold = target ~= nil and target.IsAlive

    if should_hold and not was_holding then
        keyboard.Press("W")
        was_holding = true
    elseif not should_hold and was_holding then
        keyboard.Release("W")
        was_holding = false
    end
end)

cheat.Register("shutdown", function()
    if was_holding then keyboard.Release("W") end
end)
```

### Modifier-driven panic key
```lua
cheat.Register("onUpdate", function()
    if keyboard.IsPressed("F1") then

    end
end)
```

### Repeating keystroke (autotype)
```lua
local last_send = 0
cheat.Register("onUpdate", function()
    if keyboard.IsPressed("F2") then
        local now = utility.GetTickCount()
        if now - last_send > 250 then
            keyboard.Click("Space")
            last_send = now
        end
    end
end)
```
