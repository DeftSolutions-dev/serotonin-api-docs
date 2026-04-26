---
sidebar_position: 6
title: bit
---

# `bit`

LuaJIT-style побитовые операции на 32-битных целых. 12 канонических функций, все single-form lowercase (без алиасов).

| | |
|---|---|
| **Функций** | 12 |
| **Проверено вживую** | 12 из 12 |
| **Требуемый event** | нет |
| **Сайд-эффекты** | нет, чистые функции |
| **Ширина** | 32 бита, результаты signed `int32` (`-2147483648..2147483647`) |

> **Только single form.** Lua-стандартная конвенция: `bit.band`, `bit.bor` и т.д. Без PascalCase / camelCase алиасов. См. [Обзор / Конвенция именования](../overview#конвенция-именования).

> **Shift counts маскируются до 5 бит.** `lshift(1, 32)` возвращает `1` (не `0`), потому что `32 & 31 = 0`. То же для `rshift`, `arshift`, `rol`, `ror`. Отрицательные count тоже wrap: `lshift(1, -1)` = `lshift(1, 31)`.

## Краткий справочник

| Функция | Сигнатура | Заметка | Статус |
|---|---|---|---|
| [`band`](#band--bor--bxor)   | `(a, b, ...) → int32` | побитовое И, variadic при 3+ аргументах        | <span className="status-badge verified">проверено</span> |
| [`bor`](#band--bor--bxor)    | `(a, b, ...) → int32` | побитовое ИЛИ, variadic                         | <span className="status-badge verified">проверено</span> |
| [`bxor`](#band--bor--bxor)   | `(a, b, ...) → int32` | побитовое XOR, variadic                         | <span className="status-badge verified">проверено</span> |
| [`bnot`](#bnot)              | `(a) → int32`         | побитовое НЕ                                    | <span className="status-badge verified">проверено</span> |
| [`lshift`](#lshift--rshift--arshift) | `(a, n) → int32` | логический сдвиг влево, count маскируется до `n & 31` | <span className="status-badge verified">проверено</span> |
| [`rshift`](#lshift--rshift--arshift) | `(a, n) → int32` | логический сдвиг вправо (zero-fill)         | <span className="status-badge verified">проверено</span> |
| [`arshift`](#lshift--rshift--arshift) | `(a, n) → int32` | арифметический сдвиг вправо (sign-extend)   | <span className="status-badge verified">проверено</span> |
| [`rol`](#rol--ror)           | `(a, n) → int32`      | вращение влево                                  | <span className="status-badge verified">проверено</span> |
| [`ror`](#rol--ror)           | `(a, n) → int32`      | вращение вправо                                 | <span className="status-badge verified">проверено</span> |
| [`bswap`](#bswap)            | `(a) → int32`         | swap байтового порядка (4-byte endian flip)     | <span className="status-badge verified">проверено</span> |
| [`tobit`](#tobit)            | `(a) → int32`         | нормализация Lua-числа в 32-bit signed, **округляет** до ближайшего | <span className="status-badge verified">проверено</span> |
| [`tohex`](#tohex)            | `(a, n?) → string`    | hex-строка, `n` управляет шириной и регистром   | <span className="status-badge verified">проверено</span> |

---

## `band` / `bor` / `bxor`

```lua
bit.band(a, b, ...) → int32
bit.bor (a, b, ...) → int32
bit.bxor(a, b, ...) → int32
```

Побитовые AND, OR, XOR. **Variadic** при 3+ аргументах, операция складывается слева-направо. Single-arg форма возвращает вход без изменений.

Проверено:

| Вызов | Результат |
|---|---|
| `bit.band(0xFF, 0x0F)`         | `15` (`0x0F`) |
| `bit.band(0xFF, 0x0F, 0x03)`   | `3` (variadic) |
| `bit.band(1)`                  | `1` (single-arg = identity) |
| `bit.bor (0x0F, 0xF0)`         | `255` (`0xFF`) |
| `bit.bor (0x01, 0x02, 0x04, 0x08)` | `15` (variadic, 4 args) |
| `bit.bxor(0xFF, 0x0F)`         | `240` (`0xF0`) |
| `bit.bxor(1, 2, 3)`            | `0` (`1 ^ 2 ^ 3`) |

```lua
local flags = bit.bor(FLAG_A, FLAG_B, FLAG_C)
local masked = bit.band(value, 0xFF)
```

---

## `bnot`

```lua
bit.bnot(a) → int32
```

Побитовое НЕ. Результат 32-bit signed.

| Вызов | Результат |
|---|---|
| `bit.bnot(0)`           | `-1` (`0xFFFFFFFF` как signed) |
| `bit.bnot(0xFFFFFFFF)`  | `0` |
| `bit.bnot(0xFF)`        | `-256` (`0xFFFFFF00`) |

```lua

local cleared = bit.band(value, bit.bnot(MASK))
```

---

## `lshift` / `rshift` / `arshift`

```lua
bit.lshift (a, n) → int32
bit.rshift (a, n) → int32
bit.arshift(a, n) → int32
```

Shift count маскируется до низших 5 бит (`n & 31`), как x86 `SHL/SHR/SAR` инструкции и LuaJIT-семантика.

| Вызов | Результат |
|---|---|
| `lshift(1, 0)`            | `1` |
| `lshift(1, 4)`            | `16` |
| `lshift(1, 31)`           | `-2147483648` (sign bit) |
| `lshift(1, 32)`           | `1` (count `& 31 = 0`, без сдвига) |
| `lshift(1, 33)`           | `2` (count `& 31 = 1`) |
| `lshift(1, -1)`           | `-2147483648` (count `& 31 = 31`) |
| `rshift(0xFFFFFFFF, 4)`   | `268435455` (`0x0FFFFFFF`) |
| `rshift(-1, 1)`           | `2147483647` (`0x7FFFFFFF`, zero-fill) |
| `arshift(-1, 1)`          | `-1` (sign-extend) |
| `arshift(0x80000000, 4)`  | `-134217728` (`0xF8000000`) |

```lua
local hi_byte = bit.band(bit.rshift(packed, 24), 0xFF)
local signed  = bit.arshift(bit.lshift(byte_value, 24), 24)
```

---

## `rol` / `ror`

```lua
bit.rol(a, n) → int32
bit.ror(a, n) → int32
```

Биты выходящие с одного конца входят с другого. Rotation count маскируется до `n & 31`.

| Вызов | Результат |
|---|---|
| `rol(0x12345678, 8)` | `0x34567812` (= `878082066`) |
| `ror(0x12345678, 8)` | `0x78123456` (= `2014458966`) |

---

## `bswap`

```lua
bit.bswap(a) → int32
```

Реверсирует байтовый порядок 4-байтного значения. Полезно для свопа big-endian / little-endian представлений.

Проверено: `bit.bswap(0x12345678)` возвращает `0x78563412` (= `2018915346`).

```lua
local le_value = 0x12345678
local be_value = bit.bswap(le_value)
```

---

## `tobit`

```lua
bit.tobit(a) → int32
```

Нормализует Lua-число в 32-bit signed integer.

| Вызов | Результат | Заметка |
|---|---|---|
| `tobit(0)`            | `0` | |
| `tobit(2147483647)`   | `2147483647` | точный `INT32_MAX` |
| `tobit(2147483648)`   | `-2147483648` | wrap через 32-bit truncation |
| `tobit(-1)`           | `-1` | |
| `tobit(0xFFFFFFFF)`   | `-1` | тот же bit pattern что у `-1` в `int32` |
| `tobit(1.7)`          | `2` | **округляет до ближайшего**, НЕ truncates |

:::warning `tobit` округляет, не truncates
`bit.tobit(1.7)` возвращает `2`, не `1`. Если нужен truncation используй `math.floor(x)` перед передачей. Остальные `bit.*` функции принимают float и применяют ту же rounding-семантику внутри.
:::

---

## `tohex`

```lua
bit.tohex(a)            → string
bit.tohex(a, n)         → string
```

Возвращает hex-строку. Length argument управляет и шириной поля и знаком регистра букв:

| Вызов | Результат |
|---|---|
| `tohex(0xABCD)`     | `"0000abcd"` (default 8 chars, lowercase) |
| `tohex(0xABCD, 4)`  | `"abcd"` |
| `tohex(0xABCD, 8)`  | `"0000abcd"` |
| `tohex(0xABCD, -4)` | `"ABCD"` (**отрицательная ширина = uppercase**) |
| `tohex(0)`          | `"00000000"` |
| `tohex(-1)`         | `"ffffffff"` (signed -1 = `0xFFFFFFFF`) |

```lua
print(bit.tohex(addr, 16))
print(bit.tohex(value, -8))
```

---

## Error / edge cases

| Вызов | Результат |
|---|---|
| `band()`           | `"bad argument #1 to '?' (number expected, got no value)"` |
| `band(nil)`        | то же |
| `band("s")`        | `"bad argument #1 to '?' (number expected, got string)"` |
| `band(1)`          | `1` (single-arg возвращает вход без изменений) |
| `bnot()`           | `"bad argument #1 to '?' (number expected, got no value)"` |
| `lshift(1)`        | `"bad argument #2 to '?' (number expected, got no value)"` |

`bit.*` функции никогда не крашатся на out-of-range вход, все coercions через `tobit`-семантику.

---

## Паттерны

### Упаковать четыре байта в u32
```lua
local function pack_be(b3, b2, b1, b0)
    return bit.bor(
        bit.lshift(b3, 24),
        bit.lshift(b2, 16),
        bit.lshift(b1,  8),
        b0)
end
local rgba = pack_be(255, 128, 0, 255)
```

### Распаковать packed RGBA
```lua
local function unpack_rgba(packed)
    return bit.band(bit.rshift(packed, 24), 0xFF),
           bit.band(bit.rshift(packed, 16), 0xFF),
           bit.band(bit.rshift(packed,  8), 0xFF),
           bit.band(packed,                 0xFF)
end
```

### Test, set, clear, toggle бита
```lua
local function bit_test(v, n)   return bit.band(v, bit.lshift(1, n)) ~= 0 end
local function bit_set(v, n)    return bit.bor(v, bit.lshift(1, n)) end
local function bit_clear(v, n)  return bit.band(v, bit.bnot(bit.lshift(1, n))) end
local function bit_toggle(v, n) return bit.bxor(v, bit.lshift(1, n)) end
```

### Sign-extend меньшей ширины в int32
```lua
local function sign_extend(value, src_bits)
    local shift = 32 - src_bits
    return bit.arshift(bit.lshift(value, shift), shift)
end

print(sign_extend(0xFF, 8))
print(sign_extend(0x7F, 8))
```

### Hex-dump значения
```lua
print(string.format("addr = 0x%s", bit.tohex(addr, -8)))
```
