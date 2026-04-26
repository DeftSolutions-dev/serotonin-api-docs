---
sidebar_position: 11
title: keyboard
---

# `keyboard`

Синтетический keyboard input + чтение key-state. 4 канонические функции.

| | |
|---|---|
| **Функций** | 4 (9 с алиасами) |
| **Проверено вживую** | 4 из 4 |
| **Требуемый event** | нет |
| **Сайд-эффекты** | `Click`, `Press`, `Release` инжектят OS-level keystrokes которые игра и OS видят как реальные |

> **Алиасы.** `Click`, `Press`, `Release` имеют по **две** формы (PascalCase + lowercase). `IsPressed` имеет **три** формы. См. [Обзор / Конвенция именования](../overview#конвенция-именования).

## Имена клавиш

`IsPressed` (и остальные функции по конвенции) принимают эти формы, **case-insensitive** для букв и имён:

### Принято (verified)

| Форма | Пример | Значение |
|---|---|---|
| Одиночная буква       | `"A"`, `"a"`            | соответствующая буквенная клавиша |
| Одиночная цифра       | `"1"`, `"5"`            | top-row digit |
| Function key          | `"F1"`, `"F12"`         | F-row |
| Special key (named)   | `"Space"`               | пробел |
| Special key           | `"Enter"`               | return / enter |
| Special key           | `"Escape"`              | escape |
| Modifier (без L/R)    | `"Shift"`, `"Ctrl"`, `"Alt"` | любая сторона, чит не различает left/right |
| Windows VK code (число) | `0x41` (`= 65`)        | `VK_A` |
| Windows VK code        | `0x20`                 | `VK_SPACE` |
| Windows VK code        | `0x1B`                 | `VK_ESCAPE` |

### Отвергнуто (`Unknown key or button name: '<lowercased>'`)

| Форма | Используй вместо |
|---|---|
| `"Return"`        | `"Enter"`     |
| `"Esc"`           | `"Escape"`    |
| `"LeftShift"`, `"RightShift"`     | `"Shift"`     |
| `"LeftControl"`, `"RightControl"` | `"Ctrl"`      |
| `"LeftAlt"`, `"RightAlt"`         | `"Alt"`       |
| `" "` (одиночный space char)      | `"Space"`     |

Чит нормализует вход в lowercase перед lookup (проверено: `"LeftShift"` ошибается как `"'leftshift'"`).

## Краткий справочник

| Функция | Сигнатура | Заметка | Статус |
|---|---|---|---|
| [`Click`](#click)        | `(key: string \| number)` | press + release одним вызовом (synthetic) | <span className="status-badge verified">проверено</span> |
| [`Press`](#press--release)  | `(key: string \| number)` | нажать, оставить удержанной | <span className="status-badge verified">проверено</span> |
| [`Release`](#press--release) | `(key: string \| number)` | отпустить | <span className="status-badge verified">проверено</span> |
| [`IsPressed`](#ispressed) | `(key: string \| number) → bool` | true пока клавиша удерживается | <span className="status-badge verified">проверено</span> |

Все 4 функции проверены вживую. `Press("Shift")` с последующим `Release("Shift")` подтверждены через `IsPressed("Shift")` который вернул `true` между вызовами и `false` после.

---

## `IsPressed`

```lua
keyboard.IsPressed(key: string | number) → bool
```

Возвращает `true` пока названная клавиша удерживается.

Проверено вживую (вернули `bool` чисто):

`"A"`, `"a"`, `"1"`, `"Space"`, `"Enter"`, `"Escape"`, `"Shift"`, `"Ctrl"`, `"Alt"`, `"F1"`, `"F12"`, `0x41`, `65`, `0x20`, `0x1B`.

Проверено отвергнуто:

| Вызов | Результат |
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

Синтетический press-and-release названной клавиши. Проверено вживую с `keyboard.Click("Shift")` (`ok=true`, `ret=nil`, modifier был кратко нажат и отпущен).

```lua
keyboard.Click("Space")
```

:::warning OS-level input
Этот вызов идёт через Windows synthetic-input API. Keystroke доставляется в фокусное окно, **включая non-Roblox окна**. Убедись что Roblox в фокусе или защищай через [`utility.GetMenuState`](./utility#getmenustate).
:::

---

## `Press` / `Release`

```lua
keyboard.Press(key: string | number, delay_ms?: number)
keyboard.Release(key: string | number)
```

`Press` удерживает клавишу, `Release` отпускает. **Всегда парь их**, иначе клавиша останется удержанной до следующего реального OS-event'а. Опциональный `delay_ms` на `Press` автоматически отпускает клавишу через указанное время (`keyboard.Press("W", 100)` ≡ `Press` + ожидание 100мс + `Release`).

Проверено вживую: `keyboard.Press("Shift")` с задержкой 5 мс и затем `keyboard.Release("Shift")` наблюдаемо через `keyboard.IsPressed("Shift")`:
- before: `false`
- после `Press`: `true`
- после `Release`: `false`

```lua

keyboard.Press("W")

keyboard.Release("W")
```

---

## Паттерны

### Hold W пока цель спереди
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
