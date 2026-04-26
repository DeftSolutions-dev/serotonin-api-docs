---
sidebar_position: 15
title: ui
---

# `ui`

Билдер in-game cheat-меню. 16 канонических функций: 12 builders + 4 state-операции.

| | |
|---|---|
| **Функций** | 16 (48 с алиасами) |
| **Проверено вживую** | 16 из 16 |
| **Требуемый event** | нет для builders, нет для `GetValue` / `SetValue` |
| **Сайд-эффекты** | добавляет tabs, containers и widgets в cheat-меню (живут всё время скрипта, удаляются при unload) |

> **Алиасы.** Каждая `ui.*` функция имеет **три** формы: PascalCase / camelCase / snake_case. `ui.NewCheckbox` / `ui.newCheckbox` / `ui.new_checkbox`. Все distinct callable (`f1 == f2` это `false`), см. [Обзор / Конвенция именования](../overview#конвенция-именования).

> **Нет Unregister API.** После создания tab / container / widget через `ui.New*`, они живут до выгрузки скрипта. Перезапуск скрипта (без рестарта Roblox) populate'ит тот же tab и **накопит** новые callbacks поверх старых. Всегда защищай через флаг `_ALREADY_LOADED`.

> **Widget-state очищается при unload скрипта.** Проверено: после `Unload`, ранее созданные widgets исчезают и следующий запуск стартует с чистого листа. Persistent values (saved hotkeys и т.д.) надо записывать через `file.write` и перечитывать.

## Pipeline

```
NewTab("MyTab", "My Tab")
    └── NewContainer("MyTab", "GroupA", "Group A")
            ├── NewCheckbox("MyTab", "GroupA", "Enable")
            ├── NewSliderInt("MyTab", "GroupA", "Speed", 0, 100)
            ├── NewDropdown("MyTab", "GroupA", "Mode", { "easy", "hard" })
            └── ...
```

Каждый widget адресуется тройкой `(tab, container, label)` в `GetValue` / `SetValue` / `SetVisibility`.

## Краткий справочник

### Builders (returns)

| Функция | Сигнатура | Returns | Статус |
|---|---|---|---|
| [`NewTab`](#newtab--newcontainer)         | `(tab: string, label: string)`                                | `nil`   | <span className="status-badge verified">проверено</span> |
| [`NewContainer`](#newtab--newcontainer)   | `(tab: string, container: string, label: string)`              | `nil`   | <span className="status-badge verified">проверено</span> |
| [`NewCheckbox`](#newcheckbox)             | `(tab, container, label)`                                      | `id: number` | <span className="status-badge verified">проверено</span> |
| [`NewButton`](#newbutton)                 | `(tab, container, label, callback: function)`                  | `id: number` | <span className="status-badge verified">проверено</span> |
| [`NewSliderInt`](#newsliderint--newsliderfloat) | `(tab, container, label, min: number, max: number)`     | `id: number` | <span className="status-badge verified">проверено</span> |
| [`NewSliderFloat`](#newsliderint--newsliderfloat) | `(tab, container, label, min: number, max: number)`   | `id: number` | <span className="status-badge verified">проверено</span> |
| [`NewInputText`](#newinputtext)           | `(tab, container, label)`                                      | `id: number` | <span className="status-badge verified">проверено</span> |
| [`NewDropdown`](#newdropdown--newlistbox)  | `(tab, container, label, options: table)`                     | `id: number` | <span className="status-badge verified">проверено</span> |
| [`NewListbox`](#newdropdown--newlistbox)   | `(tab, container, label, options: table)`                     | `id: number` | <span className="status-badge verified">проверено</span> |
| [`NewMultiselect`](#newmultiselect)       | `(tab, container, label, options: table)`                      | `id: number` | <span className="status-badge verified">проверено</span> |
| [`NewColorpicker`](#newcolorpicker)       | `(tab, container, label)`                                      | `id: number` | <span className="status-badge verified">проверено</span> |
| [`NewHotkey`](#newhotkey)                 | `(tab, container, label)`                                      | `id: number` | <span className="status-badge verified">проверено</span> |

### State

| Функция | Сигнатура | Заметка | Статус |
|---|---|---|---|
| [`GetValue`](#getvalue--setvalue)       | `(tab, container, label) → value`     | тип value зависит от widget, см. [таблицу](#типы-value-по-widget) | <span className="status-badge verified">проверено</span> |
| [`SetValue`](#getvalue--setvalue)       | `(tab, container, label, value)`      | тип value должен соответствовать widget                            | <span className="status-badge verified">проверено</span> |
| [`GetHotkey`](#gethotkey)               | `(tab, container, label) → table`     | возвращает `{key, key_name, mode}`                                  | <span className="status-badge verified">проверено</span> |
| [`SetVisibility`](#setvisibility)       | `(tab, container, label, visible: bool)` | скрывает или показывает конкретный widget                       | <span className="status-badge verified">проверено</span> |

## Типы value по widget

| Widget | `GetValue` возвращает | `SetValue` принимает |
|---|---|---|
| `NewCheckbox`     | `bool`                                                                    | `bool` |
| `NewButton`       | `nil` (у кнопок нет stored value, только callback)                        | n/a (используй callback) |
| `NewSliderInt`    | `number` (integer)                                                        | `number` |
| `NewSliderFloat`  | `number` (float)                                                          | `number` |
| `NewInputText`    | `string`                                                                  | `string` |
| `NewDropdown`     | `number` (1-based index в options, `0` = no selection)                    | `number` (index) |
| `NewListbox`      | `number` (та же shape что Dropdown)                                       | `number` (index) |
| `NewMultiselect`  | `table` `{[1]=bool, [2]=bool, [3]=bool}` (один bool на позицию option)    | `table` of bools |
| `NewColorpicker`  | `table` `{r=int, g=int, b=int, a=int}` (каждое `0..255`)                  | `table` `{r=, g=, b=, a=}` (НЕ `Color3`) |
| `NewHotkey`       | `bool` (`true` пока bound key удерживается)                               | `number` (Windows VK код, например `119` для F8) |

:::warning Dropdown / Listbox используют индексы, не строки
`SetValue("MyTab", "GroupA", "Mode", "easy")` raise'ит `"bad argument #4 to '?' (number expected, got string)"`. Передавай **integer index** нужной option (1-based, в порядке options-таблицы переданной в `NewDropdown`). То же для `NewListbox`.
:::

:::warning Colorpicker использует plain table, не `Color3`
`SetValue(..., Color3.fromRGB(r, g, b))` молча принимается но ничего не делает (отображаемое значение остаётся default'ом). Передавай `{ r=255, g=80, b=40, a=255 }`, integer каналы 0..255.
:::

---

## `NewTab` / `NewContainer`

```lua
ui.NewTab(tab: string, label: string)
ui.NewContainer(tab: string, container: string, label: string)
```

Создаёт adressable container в cheat-меню. Оба аргумента `NewTab` обязательны (`label` **не optional**), все три аргумента `NewContainer` обязательны. Возвращает `nil`.

Проверено вживую:

| Вызов | Результат |
|---|---|
| `NewTab("MyTab", "My Tab")`                  | tab создан, returns `nil` |
| `NewTab("MyTab")`                            | `"bad argument #2 (string expected, got no value)"` |
| `NewTab("MyTab", "Re-create")` (уже существует) | silently OK, без error |
| `NewContainer("MyTab", "GroupA", "Group A")` | container создан, returns `nil` |
| `NewContainer("MyTab", "GroupA")`            | `"bad argument #3 (string expected, got no value)"` |

Используй ту же `tab` строку во всех последующих `NewContainer` / `NewWidget` чтобы прикреплять к тому же tab.

---

## `NewCheckbox`

```lua
ui.NewCheckbox(tab: string, container: string, label: string) → id: number
```

Создаёт labelled bool-toggle. Default value `false`.

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

Создаёт кликабельную кнопку. **Callback аргумент обязателен**, `NewButton(tab, container, label)` raise'ит `"bad argument #4 (function expected, got no value)"`. Callback срабатывает на каждый клик.

`GetValue` на кнопке возвращает `nil` (у кнопок нет stored value).

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

Числовые слайдеры. `SliderInt` clamp'ит к integer, `SliderFloat` принимает дробные. Default value = `min` (проверено: slider с `min=0` defaults to `0`).

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

Single-line text-input. Default value `""`.

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

Single-select widgets. `options` это Lua-массив строк. Default `GetValue` возвращает `0` (no selection). `SetValue` принимает **1-based integer index** в `options`, **не option-строку**.

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

Multi-select widget. Default `GetValue` возвращает Lua-таблицу с одним `bool` на позицию option: `{ [1]=false, [2]=false, [3]=false }`.

`SetValue` принимает таблицу booleans индексированную **позицией option** (1-based):

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

RGBA color-picker. Default `GetValue` возвращает `{ r=255, g=255, b=255, a=255 }` (white, fully opaque). Channel-значения это integers `0..255`.

`SetValue` требует Lua-таблицу той же shape, **не `Color3` userdata**.

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

Hotkey-binding widget. Два способа читать состояние:

- [`GetValue`](#getvalue--setvalue) возвращает `bool`, удерживается ли bound key прямо сейчас.
- [`GetHotkey`](#gethotkey) возвращает binding как table `{key, key_name, mode}`.

`SetValue` принимает Windows Virtual Key код (number), например `119` для `VK_F8`. Common codes:

| Key | VK код |
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

Читает / пишет текущее значение widget. Обе функции берут тройку `(tab, container, label)` для адресации widget. Принимаемый / возвращаемый тип зависит от типа widget, см. [таблицу](#типы-value-по-widget).

`SetValue` возвращает `nil`. Type-mismatch raise'ит стандартные Lua-ошибки:

| Вызов | Результат |
|---|---|
| `SetValue(tab, container, "MySliderInt", "x")`    | `"bad argument #4 to '?' (number expected, got string)"` |
| `SetValue(tab, container, "MyDropdown", "label")` | `"bad argument #4 to '?' (number expected, got string)"` |

Передача value **wrong shape но right type** (например `Color3` для Colorpicker, или string-keyed table для Multiselect) молча принимается, но **не** меняет отображаемое значение. Всегда соответствуй schema из [таблицы value](#типы-value-по-widget).

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

Возвращает текущий binding hotkey-widget как table:

| Поле | Тип | Значение |
|---|---|---|
| `key`      | `number` | Windows VK код, `0` если unbound |
| `key_name` | `string` | display-имя, например `"F8"`, `"LMB"`, `"Unbound"` |
| `mode`     | `number` | trigger mode (`0` = on hold, observed) |

Проверенный default state свежесозданного hotkey: `{ key=0, key_name="Unbound", mode=0 }`.

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

Показывает или скрывает конкретный widget. `label` (`#3`) это **widget label**, не container. Проверено: передача bool в arg `#3` raise'ит `"bad argument #3 (string expected, got boolean)"`.

```lua
ui.NewCheckbox("MyTab", "GroupA", "Advanced Mode")
ui.NewSliderInt("MyTab", "GroupA", "Advanced Multiplier", 1, 10)

cheat.Register("onUpdate", function()
    local advanced = ui.GetValue("MyTab", "GroupA", "Advanced Mode")
    ui.SetVisibility("MyTab", "GroupA", "Advanced Multiplier", advanced)
end)
```

---

## Паттерны

### Идемпотентный bootstrap скрипта
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

### Читать settings каждый кадр
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

### Persist UI-state на диск
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

### Условная видимость widgets
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
