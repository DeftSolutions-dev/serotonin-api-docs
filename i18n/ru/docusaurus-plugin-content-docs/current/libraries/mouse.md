---
sidebar_position: 10
title: mouse
---

# `mouse`

Синтетический mouse input + чтение click-state. 5 канонических функций.

| | |
|---|---|
| **Функций** | 5 (11 с алиасами) |
| **Проверено вживую** | 5 из 5 |
| **Требуемый event** | нет |
| **Сайд-эффекты** | `Click`, `Press`, `Release`, `Scroll` инжектят OS-level mouse-input который игра и OS видят как реальный |

> **Алиасы.** `Click`, `Press`, `Release`, `Scroll` имеют по **две** формы (PascalCase + lowercase). `IsClicked` имеет **три** формы. См. [Обзор / Конвенция именования](../overview#конвенция-именования).

> **Курсорный запрос.** В этой либе нет `GetPos` / `SetPos`. Используй [`utility.GetMousePos`](./utility#getmousepos) и [`utility.MoveMouse`](./utility#movemouse) для координат курсора.

## Идентификаторы кнопок, два разных registry

Чит делит mouse-button аргументы на **две registry** с **разными принимаемыми значениями**. Проверено вживую: передача неправильного идентификатора в неправильную функцию даёт чёткую ошибку.

### `IsClicked` registry, read-only state-проба

| Форма | Заметки |
|---|---|
| `"left"`, `"LEFT"`, `"Left"`     | case-insensitive |
| `"right"`                        | |
| `"mouse4"`                       | side X1 |
| `"mouse5"`                       | side X2 |
| `0`, `1`, `2`                    | numeric, внутренний маппинг |
| `"middle"`                       | ❌ не поддерживается, используй VK код `4` через workaround |
| любая другая строка              | ❌ raise `"Unknown key or button name: '<lowercased>'"` |

### `Click` / `Press` / `Release` registry, synthetic input

Эта API **не** принимает дружественные `"left"` / `"right"` строки несмотря на то что они в lookup-таблице. Принимает только:

| Форма | Маппится в | Verified |
|---|---|---|
| `1` | `VK_LBUTTON` (left)   | ✅ |
| `2` | `VK_RBUTTON` (right)  | ✅ |
| `4` | `VK_MBUTTON` (middle) | ✅ |
| `5` | `VK_XBUTTON1` (= `"mouse4"`) | ✅ |
| `6` | `VK_XBUTTON2` (= `"mouse5"`) | ✅ |
| `"mouse4"`        | side X1 | ✅ |
| `"mouse5"`        | side X2 | ✅ |
| `"left"` / `"right"` | ❌ `"Invalid mouse button specified for Press"` (или `Click` / `Release` в зависимости от вызова) |
| `0`, `3`            | ❌ `"Invalid mouse button specified for ..."` |
| `"middle"`, `"lbutton"`, `"LMB"`, `"button1"` и т.д. | ❌ `"Unknown key or button name: '<lowercased>'"` |

Рекомендуемый паттерн: определи константы один раз и используй везде:

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

## Краткий справочник

| Функция | Сигнатура | Заметка | Статус |
|---|---|---|---|
| [`Click`](#click)        | `(button: number \| "mouse4" \| "mouse5")` | press + release одним вызовом (synthetic) | <span className="status-badge verified">проверено</span> |
| [`Press`](#press--release)  | `(button: number \| "mouse4" \| "mouse5")` | нажать, оставить удержанной         | <span className="status-badge verified">проверено</span> |
| [`Release`](#press--release) | `(button: number \| "mouse4" \| "mouse5")` | отпустить ранее нажатую            | <span className="status-badge verified">проверено</span> |
| [`Scroll`](#scroll)      | `(amount: number)`           | wheel scroll, положительное = вверх       | <span className="status-badge verified">проверено</span> |
| [`IsClicked`](#isclicked) | `(button: string \| number) → bool` | true пока кнопка удерживается        | <span className="status-badge verified">проверено</span> |

---

## `IsClicked`

```lua
mouse.IsClicked(button: string | number) → bool
```

Возвращает `true` пока названная кнопка удерживается.

Проверено вживую с [IsClicked registry](#isclicked-registry-read-only-state-проба) выше.

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

Синтезирует press-and-release названной кнопки. Опциональный `delay_ms` вставляет задержку между press и release (default ~0). Проверено вживую: `mouse.Click(1)` производит LMB-клик который downstream-приложения видят как реальный.

```lua
mouse.Click(1)
mouse.Click(2)
mouse.Click(4)
mouse.Click("mouse4")
mouse.Click(1, 50)
```

:::warning OS-level input
Этот вызов идёт через Windows synthetic-input API. Клик доставляется в фокусное окно, **включая non-Roblox окна**. Убедись что Roblox в фокусе или защищай через [`utility.GetMenuState`](./utility#getmenustate).
:::

---

## `Press` / `Release`

```lua
mouse.Press(button: number | "mouse4" | "mouse5")
mouse.Release(button: number | "mouse4" | "mouse5")
```

`Press` удерживает кнопку, `Release` отпускает. **Всегда парь их**, иначе кнопка останется удержанной до следующего реального OS-event'а. Проверено вживую с `Press(1)` / `Release(1)`, наблюдаемо через `IsClicked("left")` ставший `true` между двумя вызовами.

```lua

mouse.Press(2)

mouse.Release(2)
```

---

## `Scroll`

```lua
mouse.Scroll(amount: number)
```

Синтетический wheel-scroll. Положительный `amount` обычно вверх, отрицательный вниз. Проверено вживую: `Scroll(120)`, `Scroll(-120)`, `Scroll(0)` все возвращают `nil` чисто. Magnitude следует OS wheel-delta конвенции (одна засечка обычно `120`, но per-application interpretation варьируется).

```lua
mouse.Scroll(120)
mouse.Scroll(-360)
```

| Вызов | Результат |
|---|---|
| `Scroll()`     | `"bad argument #1 to '?' (number expected, got no value)"` |
| `Scroll(nil)`  | `"bad argument #1 to '?' (number expected, got nil)"` |
| `Scroll("s")`  | `"bad argument #1 to '?' (number expected, got string)"` |

---

## Паттерны

### Hold LMB пока цель в crosshair
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

### Triggerbot с cooldown
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

### Side-button hotkey через IsClicked
```lua
cheat.Register("onUpdate", function()
    if mouse.IsClicked("mouse4") then

    end
end)
```

### Маппинг дружественных имён вручную
```lua
local MOUSE = { LEFT = 1, RIGHT = 2, MIDDLE = 4, X1 = 5, X2 = 6 }

local function click(name)
    mouse.Click(MOUSE[name:upper()] or error("unknown: "..name))
end

click("left"); click("right"); click("middle")
```
