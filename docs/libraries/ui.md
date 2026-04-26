---
sidebar_position: 15
title: ui
---

# `ui`

In-game cheat menu builder. 16 canonical functions: 12 builders + 4 state operations.

| | |
|---|---|
| **Functions** | 16 (48 with aliases) |
| **Verified live** | 16 of 16 |
| **Required event context** | none for builders, none for `GetValue` / `SetValue` |
| **Side effects** | adds tabs, containers, and widgets to the cheat menu (persist for the script lifetime, removed when the script unloads) |

> **Aliases.** Every `ui.*` function has **three** forms: PascalCase / camelCase / snake_case. `ui.NewCheckbox` / `ui.newCheckbox` / `ui.new_checkbox`. All distinct callables (`f1 == f2` is `false`), see [Overview / Naming convention](../overview#naming-convention).

> **No Unregister API.** Once a tab / container / widget is created with `ui.New*`, it persists until the script unloads. Re-running a script (without a Roblox restart) will repopulate the same tab and **stack** new callbacks on top of old ones. Always guard with an `_ALREADY_LOADED` flag.

> **Widget state is wiped on script unload.** Verified live: after `Unload`, the previously-created widgets disappear and the next script run starts fresh. Persistent values (saved hotkeys, etc.) need to be written to `file.write` and reloaded.

## Pipeline

```
NewTab("MyTab", "My Tab")
    └── NewContainer("MyTab", "GroupA", "Group A")
            ├── NewCheckbox("MyTab", "GroupA", "Enable")
            ├── NewSliderInt("MyTab", "GroupA", "Speed", 0, 100)
            ├── NewDropdown("MyTab", "GroupA", "Mode", { "easy", "hard" })
            └── ...
```

Every widget is addressed by its `(tab, container, label)` triple in `GetValue` / `SetValue` / `SetVisibility`.

## Quick reference

### Builders (returns)

| Function | Signature | Returns | Status |
|---|---|---|---|
| [`NewTab`](#newtab--newcontainer)         | `(tab: string, label: string)`                                | `nil`   | <span className="status-badge verified">verified</span> |
| [`NewContainer`](#newtab--newcontainer)   | `(tab: string, container: string, label: string)`              | `nil`   | <span className="status-badge verified">verified</span> |
| [`NewCheckbox`](#newcheckbox)             | `(tab, container, label)`                                      | `id: number` | <span className="status-badge verified">verified</span> |
| [`NewButton`](#newbutton)                 | `(tab, container, label, callback: function)`                  | `id: number` | <span className="status-badge verified">verified</span> |
| [`NewSliderInt`](#newsliderint--newsliderfloat) | `(tab, container, label, min: number, max: number)`     | `id: number` | <span className="status-badge verified">verified</span> |
| [`NewSliderFloat`](#newsliderint--newsliderfloat) | `(tab, container, label, min: number, max: number)`   | `id: number` | <span className="status-badge verified">verified</span> |
| [`NewInputText`](#newinputtext)           | `(tab, container, label)`                                      | `id: number` | <span className="status-badge verified">verified</span> |
| [`NewDropdown`](#newdropdown--newlistbox)  | `(tab, container, label, options: table)`                     | `id: number` | <span className="status-badge verified">verified</span> |
| [`NewListbox`](#newdropdown--newlistbox)   | `(tab, container, label, options: table)`                     | `id: number` | <span className="status-badge verified">verified</span> |
| [`NewMultiselect`](#newmultiselect)       | `(tab, container, label, options: table)`                      | `id: number` | <span className="status-badge verified">verified</span> |
| [`NewColorpicker`](#newcolorpicker)       | `(tab, container, label)`                                      | `id: number` | <span className="status-badge verified">verified</span> |
| [`NewHotkey`](#newhotkey)                 | `(tab, container, label)`                                      | `id: number` | <span className="status-badge verified">verified</span> |

### State

| Function | Signature | Notes | Status |
|---|---|---|---|
| [`GetValue`](#getvalue--setvalue)       | `(tab, container, label) → value`     | value type depends on widget, see [value table](#value-types-by-widget) | <span className="status-badge verified">verified</span> |
| [`SetValue`](#getvalue--setvalue)       | `(tab, container, label, value)`      | value type must match widget                                            | <span className="status-badge verified">verified</span> |
| [`GetHotkey`](#gethotkey)               | `(tab, container, label) → table`     | returns `{key, key_name, mode}`                                         | <span className="status-badge verified">verified</span> |
| [`SetVisibility`](#setvisibility)       | `(tab, container, label, visible: bool)` | hides or shows a specific widget                                     | <span className="status-badge verified">verified</span> |

## Value types by widget

| Widget | `GetValue` returns | `SetValue` accepts |
|---|---|---|
| `NewCheckbox`     | `bool`                                                                    | `bool` |
| `NewButton`       | `nil` (buttons have no stored value, only the callback fires)             | n/a (use the callback) |
| `NewSliderInt`    | `number` (integer)                                                        | `number` |
| `NewSliderFloat`  | `number` (float)                                                          | `number` |
| `NewInputText`    | `string`                                                                  | `string` |
| `NewDropdown`     | `number` (1-based index into the options table, `0` means no selection)   | `number` (index) |
| `NewListbox`      | `number` (same shape as Dropdown)                                          | `number` (index) |
| `NewMultiselect`  | `table` `{[1]=bool, [2]=bool, [3]=bool}` (one bool per option position)   | `table` of bools |
| `NewColorpicker`  | `table` `{r=int, g=int, b=int, a=int}` (each `0..255`)                    | `table` `{r=, g=, b=, a=}` (NOT `Color3`) |
| `NewHotkey`       | `bool` (`true` while the bound key is currently held)                     | `number` (Windows VK code, e.g. `119` for F8) |

:::warning Dropdown / Listbox use indices, not strings
`SetValue("MyTab", "GroupA", "Mode", "easy")` raises `"bad argument #4 to '?' (number expected, got string)"`. You must pass the **integer index** of the desired option (1-based, with the order matching the `options` table you passed to `NewDropdown`). Same for `NewListbox`.
:::

:::warning Colorpicker uses a plain table, not `Color3`
`SetValue(..., Color3.fromRGB(r, g, b))` is silently accepted but does nothing (the displayed value stays at the default). Pass `{ r=255, g=80, b=40, a=255 }` instead, integer channels in 0..255.
:::

---

## `NewTab` / `NewContainer`

```lua
ui.NewTab(tab: string, label: string)
ui.NewContainer(tab: string, container: string, label: string)
```

Creates an addressable container in the cheat menu. Both arguments to `NewTab` are required (`label` is **not optional**), all three to `NewContainer` are required. Returns `nil`.

Verified live:

| Call | Result |
|---|---|
| `NewTab("MyTab", "My Tab")`                  | tab created, returns `nil` |
| `NewTab("MyTab")`                            | `"bad argument #2 (string expected, got no value)"` |
| `NewTab("MyTab", "Re-create")` (already exists) | silently OK, no error |
| `NewContainer("MyTab", "GroupA", "Group A")` | container created, returns `nil` |
| `NewContainer("MyTab", "GroupA")`            | `"bad argument #3 (string expected, got no value)"` |

Use the same `tab` string in all subsequent `NewContainer` / `NewWidget` calls to attach to the same tab.

---

## `NewCheckbox`

```lua
ui.NewCheckbox(tab: string, container: string, label: string) → id: number
```

Creates a labelled bool toggle. Default value is `false`.

```lua
ui.NewCheckbox("MyTab", "GroupA", "ESP On")
ui.SetValue   ("MyTab", "GroupA", "ESP On", true)

cheat.Register("onUpdate", function()
    if ui.GetValue("MyTab", "GroupA", "ESP On") then

    end
end)
```

---

## `NewButton`

```lua
ui.NewButton(tab: string, container: string, label: string, callback: function) → id: number
```

Creates a clickable button. **The callback argument is required**, `NewButton(tab, container, label)` raises `"bad argument #4 (function expected, got no value)"`. The callback fires once per click.

`GetValue` on a button returns `nil` (buttons have no stored value).

```lua
ui.NewButton("MyTab", "GroupA", "Reset Settings", function()

    file.delete("settings.json")
end)
```

---

## `NewSliderInt` / `NewSliderFloat`

```lua
ui.NewSliderInt  (tab, container, label, min: number, max: number) → id: number
ui.NewSliderFloat(tab, container, label, min: number, max: number) → id: number
```

Numeric sliders. `SliderInt` clamps to integer values, `SliderFloat` accepts fractional. Default value is `min` (verified: a slider with `min=0` defaults to `0`).

```lua
ui.NewSliderInt  ("MyTab", "GroupA", "Speed", 0, 100)
ui.NewSliderFloat("MyTab", "GroupA", "Smoothing", 0.0, 1.0)

ui.SetValue("MyTab", "GroupA", "Speed", 42)
ui.SetValue("MyTab", "GroupA", "Smoothing", 0.5)
```

---

## `NewInputText`

```lua
ui.NewInputText(tab: string, container: string, label: string) → id: number
```

Single-line text input. Default value is `""`.

```lua
ui.NewInputText("MyTab", "GroupA", "Server URL")
ui.SetValue    ("MyTab", "GroupA", "Server URL", "https://api.example.com")
```

---

## `NewDropdown` / `NewListbox`

```lua
ui.NewDropdown(tab, container, label, options: table) → id: number
ui.NewListbox (tab, container, label, options: table) → id: number
```

Single-select widgets. `options` is a Lua array of strings. Default `GetValue` returns `0` (no selection). `SetValue` takes the **1-based integer index** into `options`, **not the option string**.

```lua
ui.NewDropdown("MyTab", "GroupA", "Mode", { "Casual", "Ranked", "Practice" })
ui.SetValue   ("MyTab", "GroupA", "Mode", 2)

local idx = ui.GetValue("MyTab", "GroupA", "Mode")
local options = { "Casual", "Ranked", "Practice" }
print("current mode:", options[idx])
```

---

## `NewMultiselect`

```lua
ui.NewMultiselect(tab, container, label, options: table) → id: number
```

Multi-select widget. Default `GetValue` returns a Lua table with one `bool` per option position: `{ [1]=false, [2]=false, [3]=false }`.

`SetValue` accepts a table of bools indexed by **option position** (1-based):

```lua
ui.NewMultiselect("MyTab", "GroupA", "Targets", { "Players", "NPCs", "Vehicles" })
ui.SetValue("MyTab", "GroupA", "Targets", { true, false, true })

local sel = ui.GetValue("MyTab", "GroupA", "Targets")
if sel[1] then
if sel[3] then
```

---

## `NewColorpicker`

```lua
ui.NewColorpicker(tab, container, label) → id: number
```

RGBA color picker. Default `GetValue` returns `{ r=255, g=255, b=255, a=255 }` (white, fully opaque). Channel values are integers in `0..255`.

`SetValue` requires a Lua table of the same shape, **not a `Color3` userdata**.

```lua
ui.NewColorpicker("MyTab", "GroupA", "ESP Color")
ui.SetValue       ("MyTab", "GroupA", "ESP Color", { r = 255, g = 80, b = 40, a = 255 })

local c = ui.GetValue("MyTab", "GroupA", "ESP Color")
draw.RectFilled(10, 10, 50, 50, Color3.fromRGB(c.r, c.g, c.b), 0, c.a / 255)
```

---

## `NewHotkey`

```lua
ui.NewHotkey(tab: string, container: string, label: string) → id: number
```

Hotkey binding widget. Two ways to read the state:

- [`GetValue`](#getvalue--setvalue) returns a `bool` indicating whether the bound key is currently held.
- [`GetHotkey`](#gethotkey) returns the binding as a table `{key, key_name, mode}`.

`SetValue` accepts a Windows Virtual Key code (number), e.g. `119` for `VK_F8`. Common codes:

| Key | VK code |
|---|---|
| Letters `A-Z`     | `0x41 .. 0x5A` (`65..90`) |
| Digits `0-9`      | `0x30 .. 0x39` (`48..57`) |
| `F1..F12`         | `0x70 .. 0x7B` (`112..123`) |
| `Space`           | `0x20` (32) |
| `Escape`          | `0x1B` (27) |
| `Enter`           | `0x0D` (13) |
| `LMB`             | `0x01` (1) |
| `RMB`             | `0x02` (2) |
| `MMB`             | `0x04` (4) |

```lua
ui.NewHotkey("MyTab", "GroupA", "Panic")
ui.SetValue ("MyTab", "GroupA", "Panic", 0x70)

cheat.Register("onUpdate", function()
    if ui.GetValue("MyTab", "GroupA", "Panic") then

    end
end)
```

---

## `GetValue` / `SetValue`

```lua
ui.GetValue(tab: string, container: string, label: string) → any
ui.SetValue(tab: string, container: string, label: string, value: any)
```

Reads / writes a widget's current value. Both functions take the `(tab, container, label)` triple to address a widget. The accepted / returned value type depends on the widget kind, see the [value table](#value-types-by-widget).

`SetValue` returns `nil`. Argument-type mismatches raise standard Lua errors:

| Call | Result |
|---|---|
| `SetValue(tab, container, "MySliderInt", "x")`    | `"bad argument #4 to '?' (number expected, got string)"` |
| `SetValue(tab, container, "MyDropdown", "label")` | `"bad argument #4 to '?' (number expected, got string)"` |

Setting a value that is the **wrong shape but the right type** (e.g. a `Color3` for a Colorpicker, or a string-keyed table for Multiselect) is silently accepted but does **not** change the displayed value. Always match the schema in the [value table](#value-types-by-widget).

```lua

local function snapshot(tab, container, labels)
    local out = {}
    for _, label in ipairs(labels) do
        out[label] = ui.GetValue(tab, container, label)
    end
    return out
end
```

---

## `GetHotkey`

```lua
ui.GetHotkey(tab: string, container: string, label: string) → table
```

Returns the current binding of a hotkey widget as a table:

| Field | Type | Meaning |
|---|---|---|
| `key`      | `number` | Windows VK code, `0` if unbound |
| `key_name` | `string` | display name, e.g. `"F8"`, `"LMB"`, `"Unbound"` |
| `mode`     | `number` | trigger mode (`0` = on hold, observed value) |

Verified default state of a freshly-created hotkey: `{ key=0, key_name="Unbound", mode=0 }`.

```lua
local hk = ui.GetHotkey("MyTab", "GroupA", "Panic")
draw.Text(string.format("Panic: %s", hk.key_name), 10, 10,
    Color3.new(1, 1, 1), "ConsolasBold", 1)
```

---

## `SetVisibility`

```lua
ui.SetVisibility(tab: string, container: string, label: string, visible: bool)
```

Shows or hides a specific widget. The `label` argument (`#3`) is **the widget label**, not the container. Verified live: passing a bool at arg `#3` raises `"bad argument #3 (string expected, got boolean)"`.

```lua
ui.NewCheckbox("MyTab", "GroupA", "Advanced Mode")
ui.NewSliderInt("MyTab", "GroupA", "Advanced Multiplier", 1, 10)

cheat.Register("onUpdate", function()
    local advanced = ui.GetValue("MyTab", "GroupA", "Advanced Mode")
    ui.SetVisibility("MyTab", "GroupA", "Advanced Multiplier", advanced)
end)
```

---

## Patterns

### Idempotent script bootstrap
```lua
if not _MTC_UI_BUILT then
    _MTC_UI_BUILT = true

    ui.NewTab("MTC", "MTC")
    ui.NewContainer("MTC", "Visuals", "Visuals")

    ui.NewCheckbox    ("MTC", "Visuals", "Box ESP")
    ui.NewSliderFloat ("MTC", "Visuals", "Box Thickness", 0.5, 4.0)
    ui.NewColorpicker ("MTC", "Visuals", "Box Color")
    ui.NewHotkey      ("MTC", "Visuals", "Toggle ESP")

    ui.NewContainer("MTC", "Aim", "Aim")
    ui.NewCheckbox  ("MTC", "Aim", "Aim Assist")
    ui.NewSliderInt ("MTC", "Aim", "FOV", 0, 180)
    ui.NewDropdown  ("MTC", "Aim", "Bone", { "Head", "UpperTorso", "HumanoidRootPart" })
end
```

### Read settings every frame
```lua
local function snapshot()
    local s = {}
    s.box_on    = ui.GetValue("MTC", "Visuals", "Box ESP")
    s.thickness = ui.GetValue("MTC", "Visuals", "Box Thickness")
    s.color     = ui.GetValue("MTC", "Visuals", "Box Color")
    s.aim_on    = ui.GetValue("MTC", "Aim", "Aim Assist")
    s.fov       = ui.GetValue("MTC", "Aim", "FOV")
    s.bone_idx  = ui.GetValue("MTC", "Aim", "Bone")
    s.toggle    = ui.GetValue("MTC", "Visuals", "Toggle ESP")
    return s
end

cheat.Register("onPaint", function()
    local s = snapshot()
    if not s.box_on then return end
    local color = Color3.fromRGB(s.color.r, s.color.g, s.color.b)

end)
```

### Persist UI state to disk
```lua
local CONFIG_PATH = "mtc_settings.json"

local function save()
    local s = {
        box_on    = ui.GetValue("MTC", "Visuals", "Box ESP"),
        thickness = ui.GetValue("MTC", "Visuals", "Box Thickness"),
        color     = ui.GetValue("MTC", "Visuals", "Box Color"),
    }

    local parts = {}
    for k, v in pairs(s) do parts[#parts+1] = string.format('%q:%s', k, tostring(v)) end
    file.write(CONFIG_PATH, "{" .. table.concat(parts, ",") .. "}")
end

ui.NewButton("MTC", "Visuals", "Save", save)

cheat.Register("shutdown", save)
```

### Conditional widget visibility
```lua
ui.NewCheckbox("MTC", "Aim", "Show Advanced")
local advanced_widgets = { "FOV Speed", "Smoothing", "Snap Factor" }

cheat.Register("onUpdate", function()
    local show = ui.GetValue("MTC", "Aim", "Show Advanced")
    for _, label in ipairs(advanced_widgets) do
        ui.SetVisibility("MTC", "Aim", label, show)
    end
end)
```
