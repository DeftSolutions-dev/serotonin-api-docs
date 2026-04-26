---
sidebar_position: 2
title: Color3
---

# `Color3`

RGB-значение цвета. Используется во всех drawing-вызовах (`draw.Rect`, `draw.Text`, `draw.Line` и т.д.) и как Roblox `BasePart.Color`.

| | |
|---|---|
| **Статические фабрики** | 4 (`new`, `fromRGB`, `fromHSV`, `fromHex`) |
| **Поля instance** | `R`, `G`, `B` (все `number`, диапазон `0..1`) |
| **Методы instance** | 3 (`ToHex`, `ToHSV`, `Lerp`) |
| **Операторы** | нет (ни арифметики, ни value-equality `==`) |

> **Алиасы.** `fromRGB`, `fromHSV`, `fromHex`, `ToHSV`, `ToHex` имеют по **три** формы (PascalCase, camelCase, super-snake): `Color3.fromRGB` / `Color3.from_r_g_b` / `Color3.FromRGB`. `Lerp` имеет **две** (PascalCase + lowercase). `new` имеет **одну**. См. [Обзор / Конвенция именования](../overview#конвенция-именования).

> **Диапазон каналов.** Внутри `R`, `G`, `B` хранятся как `0..1` float'ы (Roblox-стандарт). Форма `tostring` печатает их как `0..255` байты, см. [tostring заметку](#tostring) ниже.

## Краткий справочник

### Static `Color3.*`

| Имя | Сигнатура | Заметка | Статус |
|---|---|---|---|
| [`new`](#new)         | `(r: number, g: number, b: number) → Color3` | компоненты в `0..1` (Roblox-стандарт)             | <span className="status-badge verified">проверено</span> |
| [`fromRGB`](#fromrgb) | `(r: number, g: number, b: number) → Color3` | компоненты в `0..255`, молча клампятся            | <span className="status-badge verified">проверено</span> |
| [`fromHex`](#fromhex) | `(hex: string) → Color3`                      | ровно 6 hex-символов, опциональный `#` в начале   | <span className="status-badge verified">проверено</span> |
| [`fromHSV`](#fromhsv) | `(h: number, s: number, v: number) → Color3` | hue / saturation / value, все в `0..1`            | <span className="status-badge verified">проверено</span> |

### Instance `c.*` и `c:*`

| Член | Тип | Заметка |
|---|---|---|
| `c.R`, `c.G`, `c.B`        | `number` (`0..1`)               | Roblox-стандартные нормализованные каналы |
| [`c:ToHex()`](#tohex)      | `string`                        | `#RRGGBB` uppercase с ведущим `#` |
| [`c:ToHSV()`](#tohsv)      | 3 числа (multi-return)          | `h, s, v` каждый в `0..1` |
| [`c:Lerp(other, t)`](#lerp) | `Color3`                       | покомпонентная линейная интерполяция |

---

## `new`

```lua
Color3.new(r: number, g: number, b: number) → Color3
```

Создаёт цвет из трёх `0..1` float'ов. Это стандартный Roblox-конструктор.

Проверено: `Color3.new(0.5, 0.25, 0.1)` возвращает цвет с `.R = 0.5`, `.G = 0.25`, `.B ≈ 0.1`.

```lua
local soft_orange = Color3.new(0.9, 0.5, 0.1)
```

---

## `fromRGB`

```lua
Color3.fromRGB(r: number, g: number, b: number) → Color3
```

Создаёт цвет из трёх `0..255` integer'ов. Внутри делит на `255` для получения `0..1` float'ов.

| Вызов | Результат `(R, G, B)` |
|---|---|
| `fromRGB(255, 128, 0)`     | `(1.0, 0.502, 0.0)` |
| `fromRGB(255, 0, 0)`       | `(1.0, 0.0, 0.0)` |
| `fromRGB(0, 0, 0)`         | `(0.0, 0.0, 0.0)` |
| `fromRGB(256, 256, 256)`   | `(1.0, 1.0, 1.0)` (clamp до `255`) |
| `fromRGB(-1, -1, -1)`      | `(0.0, 0.0, 0.0)` (clamp до `0`) |

Проверено: out-of-range аргументы молча клампятся. Без error.

```lua
local red    = Color3.fromRGB(255, 0, 0)
local cyan   = Color3.fromRGB(0, 255, 255)
draw.Rect(10, 10, 100, 100, red, 0, 0, 1)
```

---

## `fromHex`

```lua
Color3.fromHex(hex: string) → Color3
```

Парсит 6-символьную hex-строку. Ведущий `#` опционален, регистр не имеет значения.

Проверенные входы:

| Вызов | Результат |
|---|---|
| `fromHex("#FF8000")` | `(1.0, 0.502, 0.0)` (оранжевый) |
| `fromHex("FF8000")`  | то же |
| `fromHex("ff8000")`  | то же |
| `fromHex("#fff")`    | error: `"Invalid hex code, must be 6 characters long"` |
| `fromHex("#FFFFFFFF")` | error: `"Invalid hex code, must be 6 characters long"` |
| `fromHex("garbage")` | та же ошибка |
| `fromHex("")`        | та же ошибка |

:::warning Короткий hex (`#fff`) НЕ поддерживается
В отличие от CSS, 3-символьная короткая форма raise'ит error. Всегда передавай полную 6-символьную форму.
:::

```lua
local accent = Color3.fromHex("#5BC0EB")
local warn   = Color3.fromHex("FFB400")
```

---

## `fromHSV`

```lua
Color3.fromHSV(h: number, s: number, v: number) → Color3
```

Создаёт цвет из hue / saturation / value, каждый в `0..1`. Проверено: `Color3.fromHSV(0, 1, 1)` возвращает чистый красный `(R=1, G=0, B=0)`.

```lua

cheat.register("onPaint", function()
    local hue = (utility.GetTickCount() % 1000) / 1000
    local color = Color3.fromHSV(hue, 1, 1)
    draw.Text("rainbow", 10, 10, color, 12, 1)
end)
```

---

## `ToHex`

```lua
c:ToHex() → string
```

Возвращает `#RRGGBB` uppercase с ведущим `#`. Проверено: `Color3.fromRGB(255, 0, 0):ToHex()` возвращает `"#FF0000"`.

```lua
print(Color3.fromRGB(91, 192, 235):ToHex())
```

---

## `ToHSV`

```lua
c:ToHSV() → h: number, s: number, v: number
```

Возвращает три числа (multi-return), каждое в `0..1`. Обратная к `fromHSV`.

Проверено: `Color3.fromHSV(0, 1, 1):ToHSV()` возвращает `(0, 1, 1)`.

```lua
local h, s, v = my_color:ToHSV()
local rotated = Color3.fromHSV((h + 0.5) % 1, s, v)
```

---

## `Lerp`

```lua
c:Lerp(other: Color3, t: number) → Color3
```

Покомпонентная линейная интерполяция между двумя цветами. `t = 0` возвращает `c`, `t = 1` возвращает `other`, без clamping для значений вне `[0, 1]`.

Проверено: `Color3.fromRGB(255,0,0):Lerp(Color3.fromRGB(0,0,255), 0.5)` возвращает `(R=0.5, G=0, B=0.5)` (50/50 red-blue микс, фиолетовый).

```lua
local function pulse(t)
    return Color3.fromRGB(255, 50, 50):Lerp(Color3.fromRGB(50, 255, 50), t)
end
```

---

## `tostring`

`tostring(color)` форматирует цвет как **`"r, g, b"` с каналами в `0..255` байтах**, несмотря на то что внутри хранится `0..1` float.

| Цвет | `tostring` |
|---|---|
| `Color3.new(0.5, 0.25, 0.1)`    | `"128, 64, 26"` |
| `Color3.fromRGB(255, 128, 0)`   | `"255, 128, 0"` |
| `Color3.fromRGB(0, 0, 0)`       | `"0, 0, 0"` |
| `Color3.fromHex("#FF0000")`     | `"255, 0, 0"` |

Это **не** формат который использует сам Roblox (`"R, G, B"` как `0..1` float). Считай `tostring(color)` debug-помощником, не парси его.

:::info Сравни с `entity.GetLocalPlayer().TeamColor`
Cheat-овский player `TeamColor` userdata использует другую схему: `tostring` печатает `0..65535` 16-bit каналы, а его `.R/.G/.B` аксессоры возвращают `0..255` байты. **Color3 другой**: `tostring` печатает `0..255` байты, а `.R/.G/.B` возвращают `0..1` float'ы.
:::

---

## Без арифметики, без value-equality

В отличие от `Vector3`, у `Color3` **нет арифметических метаметодов**. Проверено: каждый оператор ниже raise'ит Lua-level ошибку.

| Op | Результат |
|---|---|
| `red + blue` | error: `"attempt to perform arithmetic on ... (a userdata value)"` |
| `red * 2`    | та же ошибка |
| `-red`       | та же ошибка |
| `red == red2` | identity-only, возвращает `false` для двух value-equal но distinct цветов |

Чтобы комбинировать цвета используй [`:Lerp`](#lerp) или считай вручную:

```lua
local function add_colors(a, b)
    return Color3.new(
        math.min(1, a.R + b.R),
        math.min(1, a.G + b.G),
        math.min(1, a.B + b.B))
end
```

---

## Паттерны

### Status-палитра
```lua
local UI = {
    fg     = Color3.fromRGB(230, 230, 230),
    accent = Color3.fromHex("#5BC0EB"),
    ok     = Color3.fromRGB( 90, 220, 120),
    warn   = Color3.fromRGB(240, 180,  80),
    err    = Color3.fromRGB(240,  90,  90),
    bg     = Color3.new(0.05, 0.06, 0.07),
}
```

### Цвет от health-ratio
```lua
local function hp_color(hp_ratio)
    local low  = Color3.fromRGB(220,  60,  60)
    local high = Color3.fromRGB( 60, 220,  90)
    return low:Lerp(high, math.max(0, math.min(1, hp_ratio)))
end
```

### Конвертация TeamColor игрока в Color3
```lua

local function team_to_color3(player)
    local tc = player.TeamColor
    return Color3.fromRGB(tc.R, tc.G, tc.B)
end
```

### Hue-rotate цвета
```lua
local function rotate_hue(c, delta)
    local h, s, v = c:ToHSV()
    return Color3.fromHSV((h + delta) % 1, s, v)
end
```
