---
sidebar_position: 1
title: Vector3
---

# `Vector3`

Трёхкомпонентный float-вектор. Используется везде где встречаются позиции, размеры, скорости и world-space направления (`entity.Position`, `:GetBonePosition`, `game.CameraPosition`, `BasePart.Size` и т.д.).

| | |
|---|---|
| **Статические функции** | 12 (1 конструктор + 11 утилит) |
| **Статические константы** | 5 (`zero`, `one`, `xAxis`, `yAxis`, `zAxis`) |
| **Поля instance** | `X`, `Y`, `Z`, `Magnitude`, `Unit` |
| **Методы instance** | 11 (тот же набор что и static utilities, оба call-стиля поддерживаются) |
| **Операторы** | `+`, `-`, `*scalar`, `/scalar`, унарный `-` |

> **Алиасы.** Большинство методов имеют **две** формы (PascalCase + lowercase): `Vector3.Dot` / `Vector3.dot`. Только `new` single-form. См. [Обзор / Конвенция именования](../overview#конвенция-именования).

> **`==` это identity-only.** `Vector3.new(1,2,3) == Vector3.new(1,2,3)` возвращает `false`. Метатаблица не реализует value-equality. Используй [`:FuzzyEq(other)`](#fuzzyeq) для сравнения по значению. Pre-allocated singletons (`Vector3.zero`, `.one`, `.xAxis`, `.yAxis`, `.zAxis`) identity-equal к самим себе: `Vector3.zero == Vector3.zero` это `true`, но `Vector3.zero == Vector3.new(0, 0, 0)` это `false`, потому что `new()` всегда возвращает свежий userdata.

## Краткий справочник

### Static `Vector3.*`

| Имя | Сигнатура | Заметка | Статус |
|---|---|---|---|
| [`new`](#new)         | `(x?, y?, z?) → Vector3`              | конструктор от 0 до 3 чисел, missing args = 0      | <span className="status-badge verified">проверено</span> |
| [`zero`](#константы)  | `Vector3` константа `(0, 0, 0)`       | identity для сложения                              | <span className="status-badge verified">проверено</span> |
| [`one`](#константы)   | `Vector3` константа `(1, 1, 1)`       |                                                    | <span className="status-badge verified">проверено</span> |
| [`xAxis`](#константы) | `Vector3` константа `(1, 0, 0)`       |                                                    | <span className="status-badge verified">проверено</span> |
| [`yAxis`](#константы) | `Vector3` константа `(0, 1, 0)`       |                                                    | <span className="status-badge verified">проверено</span> |
| [`zAxis`](#константы) | `Vector3` константа `(0, 0, 1)`       |                                                    | <span className="status-badge verified">проверено</span> |
| [`Dot`](#dot)         | `(a, b) → number`                     | скалярное произведение                             | <span className="status-badge verified">проверено</span> |
| [`Cross`](#cross)     | `(a, b) → Vector3`                    | правое векторное произведение                      | <span className="status-badge verified">проверено</span> |
| [`Lerp`](#lerp)       | `(a, b, t) → Vector3`                 | покомпонентная линейная интерполяция               | <span className="status-badge verified">проверено</span> |
| [`Floor`](#floor)     | `(v) → Vector3`                       | покомпонентный `math.floor`                        | <span className="status-badge verified">проверено</span> |
| [`Ceil`](#ceil)       | `(v) → Vector3`                       | покомпонентный `math.ceil`                         | <span className="status-badge verified">проверено</span> |
| [`Abs`](#abs)         | `(v) → Vector3`                       | покомпонентный `math.abs`                          | <span className="status-badge verified">проверено</span> |
| [`Sign`](#sign)       | `(v) → Vector3`                       | покомпонентный sign (-1, 0, +1)                    | <span className="status-badge verified">проверено</span> |
| [`Min`](#min--max)    | `(a, b) → Vector3`                    | покомпонентный минимум                             | <span className="status-badge verified">проверено</span> |
| [`Max`](#min--max)    | `(a, b) → Vector3`                    | покомпонентный максимум                            | <span className="status-badge verified">проверено</span> |
| [`Angle`](#angle)     | `(a, b) → number`                     | беззнаковый угол между векторами (радианы)         | <span className="status-badge verified">проверено</span> |
| [`FuzzyEq`](#fuzzyeq) | `(a, b [, eps]) → bool`               | epsilon-tolerant value-equality                    | <span className="status-badge verified">проверено</span> |

### Instance `v.*` и `v:*`

| Член | Тип | Заметка |
|---|---|---|
| `v.X`, `v.Y`, `v.Z`            | `number` | три компоненты |
| `v.Magnitude`                  | `number` | `sqrt(X*X + Y*Y + Z*Z)`, пересчитывается при каждом доступе |
| `v.Unit`                       | `Vector3` | тот же вектор делённый на `Magnitude` (zero вектор даёт NaN-эквивалент, не обращайся к Unit на zero-векторе) |
| `v:Dot(other)`, `:Cross`, `:Lerp`, `:Floor`, `:Ceil`, `:Abs`, `:Sign`, `:Min`, `:Max`, `:Angle`, `:FuzzyEq` | разные | method-call форма, эквивалентна static с `v` как первый аргумент |

---

## `new`

```lua
Vector3.new(x?: number, y?: number, z?: number) → Vector3
```

Создаёт вектор. Missing args = `0`. Проверенные return shapes:

| Вызов | Результат |
|---|---|
| `Vector3.new()`         | `(0, 0, 0)` |
| `Vector3.new(1)`        | `(1, 0, 0)` |
| `Vector3.new(1, 2)`     | `(1, 2, 0)` |
| `Vector3.new(1, 2, 3)`  | `(1, 2, 3)` |
| `Vector3.new(1, 2, 3, 4)` | `(1, 2, 3)` (extra args молча игнорируются) |
| `Vector3.new(nil)`      | `(0, 0, 0)` (nil = 0) |
| `Vector3.new("s")`      | error: `"bad argument #1 to '?' (number expected, got string)"` |

```lua
local up    = Vector3.new(0, 1, 0)
local point = Vector3.new(120.5, 30, -88.2)
print(point.X, point.Y, point.Z, point.Magnitude)
```

---

## Константы

```lua
Vector3.zero   → (0, 0, 0)
Vector3.one    → (1, 1, 1)
Vector3.xAxis  → (1, 0, 0)
Vector3.yAxis  → (0, 1, 0)
Vector3.zAxis  → (0, 0, 1)
```

Это pre-allocated immutable userdata. Используй их вместо создания свежего `Vector3.new(0, 0, 0)` в hot path.

```lua
local pos = entity.GetLocalPlayer().Position
if pos == Vector3.zero then

end
```

:::warning `==` это identity-only
Метатаблица **не** реализует value-equality. `Vector3.new(1, 2, 3) == Vector3.new(1, 2, 3)` возвращает `false`. Используй [`:FuzzyEq`](#fuzzyeq) для сравнения по значению.
:::

---

## Операторы

| Op | Поведение | Проверено |
|---|---|---|
| `a + b`   | покомпонентное сложение  | `(1,2,3) + (4,5,6) = (5,7,9)` |
| `a - b`   | покомпонентное вычитание | `(1,2,3) - (4,5,6) = (-3,-3,-3)` |
| `a * k`   | умножение на скаляр      | `(1,2,3) * 2 = (2,4,6)` |
| `k * a`   | умножение справа         | `2 * (1,2,3) = (2,4,6)` |
| `a / k`   | деление на скаляр        | `(1,2,3) / 2 = (0.5, 1, 1.5)` |
| `-a`      | унарный минус            | `-(1,2,3) = (-1,-2,-3)` |
| `tostring(a)` | `"%.6f, %.6f, %.6f"` | `(1,2,3) → "1.000000, 2.000000, 3.000000"` |

:::warning `Vector3 * Vector3` молча возвращает ноль
`Vector3.new(1,2,3) * Vector3.new(4,5,6)` возвращает `(0, 0, 0)`, не покомпонентное произведение `(4, 10, 18)`. Метаметод `__mul` не поддерживает vector-times-vector. Используй `Vector3.Dot(a, b)` для скалярного произведения или сделай покомпонентное умножение вручную:
```lua
local function v_mul(a, b) return Vector3.new(a.X*b.X, a.Y*b.Y, a.Z*b.Z) end
```
:::

---

## `Dot`

```lua
Vector3.Dot(a: Vector3, b: Vector3) → number
a:Dot(b)                              → number
```

Стандартное скалярное произведение `a.X*b.X + a.Y*b.Y + a.Z*b.Z`. Проверено: `Vector3.new(1,2,3):Dot(Vector3.new(4,5,6))` возвращает `32`.

```lua
local fwd  = (target_pos - my_pos).Unit
local face = camera_lookvec
local dot  = fwd:Dot(face)
if dot > 0.95 then
```

---

## `Cross`

```lua
Vector3.Cross(a: Vector3, b: Vector3) → Vector3
a:Cross(b)                             → Vector3
```

Правое векторное произведение. Проверено: `Vector3.new(1,2,3):Cross(Vector3.new(4,5,6))` возвращает `(-3, 6, -3)`.

```lua
local right = up:Cross(forward)
```

---

## `Lerp`

```lua
Vector3.Lerp(a: Vector3, b: Vector3, t: number) → Vector3
a:Lerp(b, t)                                     → Vector3
```

Линейная интерполяция `a + (b - a) * t`. `t = 0` даёт `a`, `t = 1` даёт `b`, без clamping для значений вне `[0, 1]`.

Проверено: `Vector3.new(1,2,3):Lerp(Vector3.new(4,5,6), 0.5)` возвращает `(2.5, 3.5, 4.5)`.

```lua
local mid = start_pos:Lerp(end_pos, 0.5)
```

---

## `Floor`

```lua
Vector3.Floor(v: Vector3) → Vector3
v:Floor()                  → Vector3
```

Покомпонентный `math.floor`. Проверено: `Vector3.new(-1.7, 2.3, -3.9):Floor()` возвращает `(-2, 2, -4)`.

---

## `Ceil`

```lua
Vector3.Ceil(v: Vector3) → Vector3
v:Ceil()                  → Vector3
```

Покомпонентный `math.ceil`. Проверено: `Vector3.new(-1.7, 2.3, -3.9):Ceil()` возвращает `(-1, 3, -3)`.

---

## `Abs`

```lua
Vector3.Abs(v: Vector3) → Vector3
v:Abs()                  → Vector3
```

Покомпонентный `math.abs`. Проверено: `Vector3.new(-1.7, 2.3, -3.9):Abs()` возвращает `(1.7, 2.3, 3.9)`.

---

## `Sign`

```lua
Vector3.Sign(v: Vector3) → Vector3
v:Sign()                  → Vector3
```

Покомпонентный sign: возвращает `-1`, `0` или `+1` для каждой оси. Проверено: `Vector3.new(-1.7, 0, 3.9):Sign()` возвращает `(-1, 0, 1)`.

---

## `Min` / `Max`

```lua
Vector3.Min(a: Vector3, b: Vector3) → Vector3
Vector3.Max(a: Vector3, b: Vector3) → Vector3
a:Min(b) / a:Max(b)
```

Покомпонентный минимум / максимум. Полезно для AABB clipping.

```lua
local lo = Vector3.Min(corner1, corner2)
local hi = Vector3.Max(corner1, corner2)
local size = hi - lo
```

---

## `Angle`

```lua
Vector3.Angle(a: Vector3, b: Vector3) → number
a:Angle(b)                             → number
```

Возвращает беззнаковый угол в **радианах** между двумя векторами. Проверено: `Vector3.xAxis:Angle(Vector3.yAxis)` возвращает `1.5707963705063` (= π/2).

```lua
local angle_deg = math.deg(my_dir:Angle(target_dir))
```

---

## `FuzzyEq`

```lua
Vector3.FuzzyEq(a: Vector3, b: Vector3 [, eps: number]) → bool
a:FuzzyEq(b)
```

Epsilon-tolerant value-equality. Используй вместо `==` (которое identity-only). Проверено: `a:FuzzyEq(a)` возвращает `true`.

```lua
if v:FuzzyEq(Vector3.zero) then

end
```

---

## Паттерны

### Расстояние между двумя world-точками
```lua
local function dist(a, b) return (a - b).Magnitude end

local me = entity.GetLocalPlayer():GetBonePosition("HumanoidRootPart")
for _, p in ipairs(entity.GetPlayers(true)) do
    local their = p:GetBonePosition("HumanoidRootPart")
    print(p.Name, dist(me, their))
end
```

### Угол aim-направления к цели
```lua
local function angle_to(target_pos)
    local cam     = game.CameraPosition
    local fwd     = (game.GetService("Workspace").CurrentCamera and
                     game.GetService("Workspace").CurrentCamera.CFrame.LookVector)
                    or Vector3.zAxis
    local to_tgt  = (target_pos - cam).Unit
    return fwd:Angle(to_tgt)
end
```

### Snap позиции на 1-stud сетку
```lua
local function snap(v) return v:Floor() end
```

### Покомпонентное умножение (оператор не работает)
```lua
local function v_scale(a, s) return Vector3.new(a.X*s.X, a.Y*s.Y, a.Z*s.Z) end
```

### Проверка "сдвинулся ли игрок этот кадр"
```lua
local last_pos = Vector3.zero
cheat.register("onUpdate", function()
    local pos = entity.GetLocalPlayer():GetBonePosition("HumanoidRootPart")
    if not pos:FuzzyEq(last_pos) then

    end
    last_pos = pos
end)
```
