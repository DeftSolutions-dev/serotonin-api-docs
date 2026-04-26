---
sidebar_position: 14
title: draw
---

# `draw`

2D rendering API для cheat-overlay. 18 канонических функций: 13 drawing-примитивов и 5 утилит.

| | |
|---|---|
| **Функций** | 18 (46 с алиасами) |
| **Проверено вживую** | 18 из 18 |
| **Требуемый event** | `onPaint` для drawing-примитивов. Утилиты (`GetScreenSize`, `GetTextSize`, `ComputeConvexHull`, `GetPartCorners`, `GetMesh`) работают везде. |
| **Сайд-эффекты** | оверлей графики поверх Roblox-окна на один кадр |

> **Алиасы.** Two-form (PascalCase + lowercase) для однословных глаголов (`Line` / `line`, `Rect` / `rect`, `Text` / `text` и т.д.). Three-form (PascalCase / camelCase / snake_case) для multi-word имён (`RectFilled` / `rectFilled` / `rect_filled`, `GetTextSize` / `getTextSize` / `get_text_size`). Алиасы это разные Lua callable, см. [Обзор / Конвенция именования](../overview#конвенция-именования).

> **Drawing-примитивы вне `onPaint` молча no-op.** Проверено: `draw.Line` и др. вызванные вне `onPaint` callback возвращают `nil` без raise и без рендера. Не полагайся, всегда рендерь из `onPaint`.

## Краткий справочник

### Drawing-примитивы (только в `onPaint`)

| Функция | Сигнатура | Статус |
|---|---|---|
| [`Line`](#line)                 | `(x1, y1, x2, y2, color: Color3, thickness?: number, alpha?: number)` | <span className="status-badge verified">проверено</span> |
| [`Rect`](#rect--rectfilled)     | `(x, y, w, h, color: Color3, thickness?, rounding?, alpha?)` | <span className="status-badge verified">проверено</span> |
| [`RectFilled`](#rect--rectfilled) | `(x, y, w, h, color: Color3, rounding?, alpha?)` | <span className="status-badge verified">проверено</span> |
| [`Circle`](#circle--circlefilled) | `(x, y, r, color: Color3, thickness?, segments?, alpha?)` | <span className="status-badge verified">проверено</span> |
| [`CircleFilled`](#circle--circlefilled) | `(x, y, r, color: Color3, segments?, alpha?)` | <span className="status-badge verified">проверено</span> |
| [`Triangle`](#triangle--trianglefilled) | `(x1, y1, x2, y2, x3, y3, color: Color3, thickness?, alpha?)` | <span className="status-badge verified">проверено</span> |
| [`TriangleFilled`](#triangle--trianglefilled) | `(x1, y1, x2, y2, x3, y3, color: Color3, alpha?)` | <span className="status-badge verified">проверено</span> |
| [`Polyline`](#polyline)         | `(points: table, color: Color3, closed: bool, thickness: number, alpha?)` | <span className="status-badge verified">проверено</span> |
| [`ConvexPolyFilled`](#convexpolyfilled) | `(points: table, color: Color3, alpha?)` | <span className="status-badge verified">проверено</span> |
| [`Gradient`](#gradient)         | `(x, y, w, h, c1: Color3, c2: Color3, isHorizontal: bool, alpha1?, alpha2?)` | <span className="status-badge verified">проверено</span> |
| [`Text`](#text--textoutlined)   | `(text: string, x, y, color: Color3, font?: string, alpha?: number)` | <span className="status-badge verified">проверено</span> |
| [`TextOutlined`](#text--textoutlined) | `(text: string, x, y, color: Color3, font?: string, alpha?: number, size?: number)` | <span className="status-badge verified">проверено</span> |
| [`Image`](#image)               | `(texId: number, x, y, w, h, color?: Color3, alpha?: number)` | <span className="status-badge verified">проверено</span> |

### Утилиты (работают везде)

| Функция | Сигнатура | Статус |
|---|---|---|
| [`GetScreenSize`](#getscreensize)   | `() → w: number, h: number` | <span className="status-badge verified">проверено</span> |
| [`GetTextSize`](#gettextsize)       | `(text: string, font?: string) → w: number, h: number` | <span className="status-badge verified">проверено</span> |
| [`ComputeConvexHull`](#computeconvexhull) | `(points: table) → table` | <span className="status-badge verified">проверено</span> |
| [`GetPartCorners`](#getpartcorners) | `(part: Instance) → table` | <span className="status-badge verified">проверено</span> |
| [`GetMesh`](#getmesh)               | `(part: Instance) → ?` | <span className="status-badge verified">проверено</span> |

## Координатная система

`(0, 0)` это **верхний-левый** угол Roblox-окна. `x` растёт вправо, `y` растёт вниз. Пиксельные единицы. Размер экрана `(w, h)` через [`GetScreenSize`](#getscreensize).

## Color и alpha

Все drawing-примитивы ожидают `Color3` userdata для color-аргумента, **не** packed RGBA ints. Используй `Color3.fromRGB(r, g, b)` или `Color3.new(r, g, b)`. Alpha (где поддерживается) это отдельный trailing `0..1` аргумент.

## Шрифты

Проверено вживую через `draw.GetTextSize("Hello, World!", font)`:

| Имя шрифта (case-sensitive) | Width × Height для `"Hello, World!"` |
|---|---|
| `"ConsolasBold"`         | 104 × 15 |
| `"SmallestPixel"`        | 61 × 10 |
| `"Verdana"`              | 80 × 15 |
| `"Tahoma"`               | 71 × 15 |
| omit / ничего не передавать | 71 × 15 (совпадает с Tahoma, default-шрифт) |
| любое неизвестное имя (`"garbage_font"`) | 71 × 15 (silent fallback на default) |

Передай любое другое имя и чит молча использует default-шрифт.

---

## `Line`

```lua
draw.Line(x1: number, y1: number, x2: number, y2: number,
          color: Color3, thickness?: number, alpha?: number)
```

Рисует линию на 1 кадр от `(x1, y1)` до `(x2, y2)`. `thickness` default `1`, `alpha` default `1`.

```lua
cheat.Register("onPaint", function()
    draw.Line(100, 100, 200, 100, Color3.fromRGB(255, 255, 255), 1, 1)
end)
```

---

## `Rect` / `RectFilled`

```lua
draw.Rect      (x, y, w, h, color: Color3, thickness?, rounding?, alpha?)
draw.RectFilled(x, y, w, h, color: Color3, rounding?, alpha?)
```

Outline (`Rect`) или filled (`RectFilled`) AABB-прямоугольник. `rounding` это радиус скругления углов в пикселях (`0` = острые углы).

```lua
draw.Rect      ( 10,  10, 100, 30, Color3.new(1, 1, 1), 1, 0,   1)
draw.RectFilled( 10,  50, 100, 30, Color3.new(0.2, 0.2, 0.25), 4, 0.85)
```

---

## `Circle` / `CircleFilled`

```lua
draw.Circle      (x, y, r, color: Color3, thickness?, segments?, alpha?)
draw.CircleFilled(x, y, r, color: Color3, segments?, alpha?)
```

`segments` default `12` (low-poly). Передай больше (`32` или `64`) для гладких кругов.

```lua
draw.Circle      (250, 130, 15, Color3.fromRGB(50, 220, 50), 1, 32, 1)
draw.CircleFilled(280, 130, 12, Color3.fromRGB(70, 130, 240), 32, 0.7)
```

---

## `Triangle` / `TriangleFilled`

```lua
draw.Triangle      (x1, y1, x2, y2, x3, y3, color: Color3, thickness?, alpha?)
draw.TriangleFilled(x1, y1, x2, y2, x3, y3, color: Color3, alpha?)
```

```lua
draw.TriangleFilled(380, 100, 420, 100, 400, 140,
    Color3.fromRGB(255, 50, 50), 0.7)
```

---

## `Polyline`

```lua
draw.Polyline(points: table, color: Color3, closed: bool, thickness: number, alpha?)
```

Соединяет каждые соседние точки линиями. `closed` соединяет последнюю точку с первой. `points` это массив 2-element таблиц `{x, y}`.

```lua
draw.Polyline(
    {{440, 100}, {460, 140}, {480, 100}, {500, 140}},
    Color3.new(1, 1, 1), false, 1, 1)
```

---

## `ConvexPolyFilled`

```lua
draw.ConvexPolyFilled(points: table, color: Color3, alpha?)
```

Заполняет выпуклый полигон. Список точек должен быть **выпуклым и упорядоченным** (без самопересечений). Используй с [`ComputeConvexHull`](#computeconvexhull) если есть произвольные точки.

```lua
local pts = {{520, 100}, {570, 100}, {595, 140}, {545, 160}, {520, 140}}
draw.ConvexPolyFilled(pts, Color3.fromRGB(70, 130, 240), 0.7)
```

---

## `Gradient`

```lua
draw.Gradient(x, y, w, h,
              c1: Color3, c2: Color3,
              isHorizontal: bool,
              alpha1?: number, alpha2?: number)
```

Рендерит линейный 2-stop градиент внутри прямоугольника. `isHorizontal == true`: слева-направо (c1 в c2), `false`: сверху-вниз.

```lua
draw.Gradient(100, 200, 200, 30,
              Color3.fromRGB(255, 50, 50),
              Color3.fromRGB(70, 130, 240),
              true, 1, 1)
```

---

## `Text` / `TextOutlined`

```lua
draw.Text        (text: string, x: number, y: number, color: Color3, font?: string, alpha?: number, size?: number)
draw.TextOutlined(text: string, x: number, y: number, color: Color3, font?: string, alpha?: number, size?: number)
```

`Text` рендерит plain text. `TextOutlined` добавляет 1-pixel тёмную обводку вокруг каждого символа (читабельнее на noisy backgrounds, дефолт для HUD).

`font` это одно из [проверенных имён](#шрифты). Неизвестные имена молча fallback'ат на default.

`size` переопределяет дефолтную высоту шрифта в пикселях. Не передавай (или `nil`) чтобы использовать нативный размер шрифта.

```lua
draw.Text        ("FPS: 144", 10, 10, Color3.fromRGB(230, 230, 230), "ConsolasBold", 1)
draw.TextOutlined("AIM",      10, 30, Color3.fromRGB( 90, 220, 120), "Verdana",      1)
draw.TextOutlined("BIG",      10, 60, Color3.fromRGB(255, 255, 255), "Verdana",      1, 36)
```

---

## `Image`

```lua
draw.Image(texId: number, x: number, y: number, w: number, h: number,
           color?: Color3, alpha?: number)
```

Рендерит ранее загруженную текстуру по id. `color` это опциональный тинт (опусти для без-тинта), `alpha` это опциональный `0..1` opacity множитель. Получай `texId` через [`utility.LoadImage`](./utility#loadimage).

Проверено вживую с реальным PNG (`logo.png`, 21816 байт, загружен через `utility.LoadImage` → `texid = 1`):

| Вызов | Результат |
|---|---|
| `Image(texid, x, y, w, h)`                                  | рендер, без тинта, без alpha-override |
| `Image(texid, x, y, w, h, Color3.fromRGB(255, 60, 60))`      | рендер тонированный красным |
| `Image(texid, x, y, w, h, Color3.new(0.5, 0.5, 1.0))`        | рендер тонированный; обе `Color3` фабрики принимаются |
| `Image(texid, x, y, w, h, Color3.new(1,1,1), 0.5)`           | рендер при 50% alpha |
| `Image(texid, x, y, w, h, Color3.new(1,1,1), 0)`             | рендер при 0% alpha (невидим, без error) |
| `Image(texid, x, y, w, h, Color3.new(1,1,1), 1, 0)`          | trailing extra args молча игнорируются |
| `Image(texid, x, y, w, h, 255)`                              | `"bad argument #6 to '?' (__color3_meta expected, got number)"`. Arg #6 должен быть `Color3`, не raw RGBA ints |
| `Image(99999, x, y, w, h, Color3.new(1,1,1))`                | silent no-op (невалидный texid не raise'ит, просто ничего не рендерится) |
| `Image(nil, x, y, w, h)`                                     | `"bad argument #1 to '?' (number expected, got nil)"` |
| `Image("x", x, y, w, h)`                                     | `"bad argument #1 to '?' (number expected, got string)"` |

:::warning Старые доки имели неправильную сигнатуру
Сигнатура была заявлена как `(texId, x, y, w, h, r, g, b, a)` с raw RGBA байтами. **Это неправильно** для этого билда. Argument `#6` имеет тип-тег `__color3_meta`, нужен реальный `Color3`. Поля после прямоугольника это `(color, alpha)`, не `(r, g, b, a)`.
:::

```lua
local tex = utility.LoadImage(file.read("hud.png"))
if tex then
    cheat.Register("onPaint", function()
        draw.Image(tex, 16, 16, 64, 64)
        draw.Image(tex, 96, 16, 64, 64, Color3.fromRGB(255, 60, 60))
        draw.Image(tex, 16, 96, 64, 64, Color3.new(1, 1, 1), 0.5)
    end)
end
```

---

## `GetScreenSize`

```lua
draw.GetScreenSize() → w: number, h: number
```

Возвращает размер Roblox-окна в пикселях как **два return value** (multi-return), не таблица. Проверено: `(2048, 1208)` на 2K-сессии. **Работает внутри и вне `onPaint`.** Функционально идентично [`cheat.GetWindowSize`](./cheat#getwindowsize).

```lua
local w, h = draw.GetScreenSize()
```

---

## `GetTextSize`

```lua
draw.GetTextSize(text: string, font?: string) → w: number, h: number
```

Возвращает размер в пикселях который займёт текст при рендере через `Text` или `TextOutlined`. Проверенные значения см. в [таблице шрифтов](#шрифты).

Проверенные arg-поведения:

| Вызов | Результат |
|---|---|
| `GetTextSize("Hello, World!")`              | `(71, 15)` |
| `GetTextSize("Hello, World!", "ConsolasBold")` | `(104, 15)` |
| `GetTextSize("Hello, World!", "garbage_font")` | `(71, 15)` (silent default fallback) |
| `GetTextSize(123)`                          | возвращает одно число `21`, чит coerce'ит non-string args в строку (`"123"`) и измеряет |
| `GetTextSize()`                             | `"bad argument #1 (string expected, got no value)"` |
| `GetTextSize(nil)`                          | `"bad argument #1 (string expected, got nil)"` |

```lua
local w, h = draw.GetTextSize("ESP", "Verdana")
draw.Rect(10 - 2, 10 - 2, w + 4, h + 4, Color3.new(0, 0, 0), 1, 0, 0.5)
draw.Text("ESP", 10, 10, Color3.new(1, 1, 1), "Verdana", 1)
```

---

## `ComputeConvexHull`

```lua
draw.ComputeConvexHull(points: table) → table
```

Считает 2D convex hull набора точек. `points` это Lua-массив 2-element таблиц `{x, y}`. Возвращает hull в **той же форме** (массив `{x, y}`).

Проверено вживую:

| Вход | Результат |
|---|---|
| 5 точек (small star)      | 5-point hull (все входы на hull, returned в CW или CCW порядке) |
| `{}` (empty)              | `{}` |
| no arguments              | `{}` (silent, без error) |
| `nil`                     | `{}` (silent) |
| array of `Vector3`        | `{}` (Vector3 не принимается, returns empty) |

Используй перед `ConvexPolyFilled` если есть произвольные 2D точки и нужен convex outline:

```lua
local hull = draw.ComputeConvexHull({
    {100, 100}, {120, 90}, {140, 110}, {130, 130}, {110, 125}, {95, 115}
})
draw.ConvexPolyFilled(hull, Color3.fromRGB(255, 200, 50), 0.6)
```

---

## `GetPartCorners`

```lua
draw.GetPartCorners(part: Instance) → table of 8 Vector3
```

Возвращает 8 **world-space** углов oriented bounding box Roblox `BasePart` как `Vector3` userdata. Углы учитывают и `Size`, и `Rotation` - повёрнутая на 45° part вернёт настоящие повёрнутые corners, не axis-aligned приближение.

Аргумент должен быть Roblox-side `BasePart` Instance - НЕ userdata из `entity.GetParts()`. Это функция для случая когда у тебя обычный `Instance` (cheat-Part userdata имеет свой [`GetPartCubeVertices`](../userdata/Part#getpartcubevertices) метод).

:::info Coordinate space - world, не screen
Spec разработчика чита перечисляет эту функцию как возвращающую "screen-space" corners. Проверено вживую - эта заметка неверна. `corners[1]` - это `Vector3` userdata, `tostring` форматируется как `"X.000000, Y.000000, Z.000000"` (стиль Vector3), а значения совпадают с world position part'а (например `HumanoidRootPart` в world `(0, 3, 0)` возвращает corners около `(±0.5, 2..4, ±1)`). Для рисования ESP-box проецируй каждый corner через [`utility.WorldToScreen`](./utility#worldtoscreen).
:::

Проверенная arg-форма:

| Вызов | Результат |
|---|---|
| `GetPartCorners()`         | error: `"bad argument #1 (__instance expected, got no value)"` |
| `GetPartCorners(nil)`      | error: `"bad argument #1 (__instance expected, got nil)"` |
| `GetPartCorners("string")` | error: `"bad argument #1 (__instance expected, got string)"` |
| `GetPartCorners(workspace_basepart)` | `{ [1..8] = Vector3 }` |

Проверенный возврат на `HumanoidRootPart` (Size = 2x2x1 stud, world position около `(0, 3, 0)`):

```
[1] = 0.500000, 2.096318, -1.000002
[2] = 0.500000, 2.096318,  1.000002
[3] = 0.500000, 4.096322, -1.000002
[4] = 0.500000, 4.096322,  1.000002
[5] = -0.500000, 2.096318, -1.000002
[6] = -0.500000, 2.096318,  1.000002
[7] = -0.500000, 4.096322, -1.000002
[8] = -0.500000, 4.096322,  1.000002
```

Порядок corners консистентен между вызовами. Чтобы нарисовать wireframe-box, парь индексы на противоположных гранях cuboid (1↔5, 2↔6, 3↔7, 4↔8 для вертикальных edges; 1↔2, 3↔4, 5↔6, 7↔8 для одной горизонтальной оси; 1↔3, 2↔4, 5↔7, 6↔8 для другой).

```lua
local corners = draw.GetPartCorners(part_inst)
local edges = {
    {1,2},{3,4},{5,6},{7,8},   -- z-axis edges
    {1,3},{2,4},{5,7},{6,8},   -- y-axis edges
    {1,5},{2,6},{3,7},{4,8},   -- x-axis edges
}
local color = Color3.fromRGB(255, 200, 0)
for _, e in ipairs(edges) do
    local a = corners[e[1]]
    local b = corners[e[2]]
    local ax, ay, ona = utility.WorldToScreen(a)
    local bx, by, onb = utility.WorldToScreen(b)
    if ona and onb then
        draw.Line(ax, ay, bx, by, color, 1)
    end
end
```

---

## `GetMesh`

```lua
draw.GetMesh(part: Instance) → ?
```

Возвращает mesh-data для Roblox `MeshPart`. **Требует именно `MeshPart`** - передача обычной `Part` поднимает проверенную runtime-ошибку.

Проверенная arg-форма:

| Вызов | Результат |
|---|---|
| `GetMesh()`         | error: `"bad argument #1 to '?' (userdata expected, got no value)"` |
| `GetMesh(part)` (Part, не MeshPart) | error: `"Expected a MeshPart instance."` |
| `GetMesh(meshpart)` | mesh-data таблица (shape ожидает follow-up probe с гарантированно-загруженной MeshPart) |

```lua
local kid = game.Workspace:FindFirstChild("MyMeshPart")
if kid and kid.ClassName == "MeshPart" then
    local mesh = draw.GetMesh(kid)
    if mesh then
    end
end
```

---

## Паттерны

### Anchored HUD через `GetScreenSize`
```lua
cheat.Register("onPaint", function()
    local W, H = draw.GetScreenSize()
    draw.RectFilled(W - 220, H - 80, 210, 70, Color3.new(0.1, 0.1, 0.12), 4, 0.85)
    draw.TextOutlined("MTC v0.1",        W - 212, H - 74, Color3.new(1, 1, 1), "ConsolasBold", 1)
    draw.TextOutlined(string.format("FPS %.0f", 1 / utility.GetDeltaTime()),
        W - 212, H - 56, Color3.new(0.6, 1, 0.6), "ConsolasBold", 1)
end)
```

### Helper для центрированного текста
```lua
local function draw_text_centered(text, cx, cy, color, font)
    local w, h = draw.GetTextSize(text, font)
    draw.TextOutlined(text, cx - w * 0.5, cy - h * 0.5, color, font, 1)
end
```

### Skeleton ESP с bones
```lua
local LIMBS = {
    { "Head", "UpperTorso" }, { "UpperTorso", "LowerTorso" },
    { "UpperTorso", "LeftUpperArm" }, { "UpperTorso", "RightUpperArm" },
    { "LowerTorso", "LeftUpperLeg" }, { "LowerTorso", "RightUpperLeg" },
}

cheat.Register("onPaint", function()
    for _, p in ipairs(entity.GetPlayers(true)) do
        if p.IsAlive and p.IsVisible then
            for _, pair in ipairs(LIMBS) do
                local a = p:GetBonePosition(pair[1])
                local b = p:GetBonePosition(pair[2])
                local sa = { utility.WorldToScreen(a) }
                local sb = { utility.WorldToScreen(b) }
                if sa[3] and sb[3] then
                    draw.Line(sa[1], sa[2], sb[1], sb[2],
                        Color3.fromRGB(220, 90, 90), 1, 1)
                end
            end
        end
    end
end)
```

### Box ESP через `GetPartCorners`
```lua
cheat.Register("onPaint", function()
    for _, p in ipairs(entity.GetPlayers(true)) do
        if not p.IsAlive then goto continue end
        local hrp = p:GetBoneInstance("HumanoidRootPart")
        if not hrp then goto continue end

        local corners = draw.GetPartCorners(hrp)
        if not corners then goto continue end

        local sx, sy = {}, {}
        for i, c in ipairs(corners) do
            local x, y, on = utility.WorldToScreen(c)
            if not on then goto continue end
            sx[i], sy[i] = x, y
        end
        for i = 1, 8 do
            local j = i + 1; if j > 8 then j = 1 end
            if sx[i] and sx[j] then
                draw.Line(sx[i], sy[i], sx[j], sy[j],
                    Color3.fromRGB(255, 255, 0), 1, 1)
            end
        end
        ::continue::
    end
end)
```

### Convex polygon из произвольных точек
```lua
local function draw_polygon(points, color)
    local hull = draw.ComputeConvexHull(points)
    if hull and #hull >= 3 then
        draw.ConvexPolyFilled(hull, color, 0.6)
    end
end
```
