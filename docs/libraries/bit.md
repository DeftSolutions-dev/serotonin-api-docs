---
sidebar_position: 6
title: bit
---

# `bit`

LuaJIT-style bitwise operations on 32-bit integers. 12 canonical functions, all single lowercase form (no aliases).

| | |
|---|---|
| **Functions** | 12 |
| **Verified live** | 12 of 12 |
| **Required event context** | none |
| **Side effects** | none, pure functions |
| **Integer width** | 32 bits, results are signed `int32` (range `-2147483648..2147483647`) |

> **Single form only.** Lua-standard library convention: `bit.band`, `bit.bor`, etc. No PascalCase or camelCase aliases. See [Overview / Naming convention](../overview#naming-convention).

> **Shift counts are masked to 5 bits.** `lshift(1, 32)` returns `1` (not `0`), because `32 & 31 = 0`. Same for `rshift`, `arshift`, `rol`, `ror`. Negative counts also wrap: `lshift(1, -1)` is `lshift(1, 31)`.

## Quick reference

| Function | Signature | Notes | Status |
|---|---|---|---|
| [`band`](#band-bor-bxor)   | `(a, b, ...) → int32` | bitwise AND, variadic in 3+ args                         | <span className="status-badge verified">verified</span> |
| [`bor`](#band-bor-bxor)    | `(a, b, ...) → int32` | bitwise OR, variadic                                     | <span className="status-badge verified">verified</span> |
| [`bxor`](#band-bor-bxor)   | `(a, b, ...) → int32` | bitwise XOR, variadic                                    | <span className="status-badge verified">verified</span> |
| [`bnot`](#bnot)            | `(a) → int32`         | bitwise NOT                                              | <span className="status-badge verified">verified</span> |
| [`lshift`](#lshift-rshift-arshift) | `(a, n) → int32` | logical left shift, count masked to `n & 31`         | <span className="status-badge verified">verified</span> |
| [`rshift`](#lshift-rshift-arshift) | `(a, n) → int32` | logical right shift (zero-fill)                      | <span className="status-badge verified">verified</span> |
| [`arshift`](#lshift-rshift-arshift) | `(a, n) → int32` | arithmetic right shift (sign-extending)             | <span className="status-badge verified">verified</span> |
| [`rol`](#rol-ror)          | `(a, n) → int32`      | rotate left                                              | <span className="status-badge verified">verified</span> |
| [`ror`](#rol-ror)          | `(a, n) → int32`      | rotate right                                             | <span className="status-badge verified">verified</span> |
| [`bswap`](#bswap)          | `(a) → int32`         | swap byte order (4-byte endian flip)                     | <span className="status-badge verified">verified</span> |
| [`tobit`](#tobit)          | `(a) → int32`         | normalize Lua number to 32-bit signed, **rounds** to nearest | <span className="status-badge verified">verified</span> |
| [`tohex`](#tohex)          | `(a, n?) → string`    | hex-string, `n` controls width and case sign             | <span className="status-badge verified">verified</span> |

---

## `band` / `bor` / `bxor`

```lua
bit.band(a, b, ...) → int32
bit.bor (a, b, ...) → int32
bit.bxor(a, b, ...) → int32
```

Bitwise AND, OR, XOR. **Variadic** in 3+ arguments, the operation is folded left-to-right. Single-argument form returns the input unchanged.

Verified:

| Call | Result |
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

Bitwise NOT. Result is 32-bit signed.

| Call | Result |
|---|---|
| `bit.bnot(0)`           | `-1` (`0xFFFFFFFF` as signed) |
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

The shift count is masked to its low 5 bits (`n & 31`), matching x86 `SHL/SHR/SAR` instructions and LuaJIT semantics.

| Call | Result |
|---|---|
| `lshift(1, 0)`            | `1` |
| `lshift(1, 4)`            | `16` |
| `lshift(1, 31)`           | `-2147483648` (sign bit) |
| `lshift(1, 32)`           | `1` (count `& 31 = 0`, no shift) |
| `lshift(1, 33)`           | `2` (count `& 31 = 1`) |
| `lshift(1, -1)`           | `-2147483648` (count `& 31 = 31`) |
| `rshift(0xFFFFFFFF, 4)`   | `268435455` (`0x0FFFFFFF`) |
| `rshift(-1, 1)`           | `2147483647` (`0x7FFFFFFF`, zero-fill) |
| `arshift(-1, 1)`          | `-1` (sign-extending) |
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

Bits shifted out one end re-enter the other. Rotation count is masked to `n & 31`.

| Call | Result |
|---|---|
| `rol(0x12345678, 8)` | `0x34567812` (= `878082066`) |
| `ror(0x12345678, 8)` | `0x78123456` (= `2014458966`) |

---

## `bswap`

```lua
bit.bswap(a) → int32
```

Reverses the byte order of the 4-byte value. Useful for swapping between big-endian and little-endian representations.

Verified: `bit.bswap(0x12345678)` returns `0x78563412` (= `2018915346`).

```lua
local le_value = 0x12345678
local be_value = bit.bswap(le_value)
```

---

## `tobit`

```lua
bit.tobit(a) → int32
```

Normalizes a Lua number to a 32-bit signed integer.

| Call | Result | Notes |
|---|---|---|
| `tobit(0)`            | `0` | |
| `tobit(2147483647)`   | `2147483647` | exact `INT32_MAX` |
| `tobit(2147483648)`   | `-2147483648` | wraps via 32-bit truncation |
| `tobit(-1)`           | `-1` | |
| `tobit(0xFFFFFFFF)`   | `-1` | same bit pattern as `-1` in `int32` |
| `tobit(1.7)`          | `2` | **rounds to nearest**, NOT truncates |

:::warning `tobit` rounds, it does not truncate
`bit.tobit(1.7)` returns `2`, not `1`. If you need truncation use `math.floor(x)` before passing the value in. Other `bit.*` functions accept floats and apply the same rounding internally.
:::

---

## `tohex`

```lua
bit.tohex(a)            → string
bit.tohex(a, n)         → string
```

Returns a hexadecimal string. The length argument controls both the field width and the letter case sign:

| Call | Result |
|---|---|
| `tohex(0xABCD)`     | `"0000abcd"` (default 8 chars, lowercase) |
| `tohex(0xABCD, 4)`  | `"abcd"` |
| `tohex(0xABCD, 8)`  | `"0000abcd"` |
| `tohex(0xABCD, -4)` | `"ABCD"` (**negative width = uppercase**) |
| `tohex(0)`          | `"00000000"` |
| `tohex(-1)`         | `"ffffffff"` (signed -1 = `0xFFFFFFFF`) |

```lua
print(bit.tohex(addr, 16))
print(bit.tohex(value, -8))
```

---

## Error / edge cases

| Call | Result |
|---|---|
| `band()`           | `"bad argument #1 to '?' (number expected, got no value)"` |
| `band(nil)`        | same |
| `band("s")`        | `"bad argument #1 to '?' (number expected, got string)"` |
| `band(1)`          | `1` (single-arg returns input unchanged) |
| `bnot()`           | `"bad argument #1 to '?' (number expected, got no value)"` |
| `lshift(1)`        | `"bad argument #2 to '?' (number expected, got no value)"` |

`bit.*` functions never crash on out-of-range inputs, all coercions go through `tobit` semantics.

---

## Patterns

### Pack four bytes into a u32
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

### Unpack a packed RGBA color
```lua
local function unpack_rgba(packed)
    return bit.band(bit.rshift(packed, 24), 0xFF),
           bit.band(bit.rshift(packed, 16), 0xFF),
           bit.band(bit.rshift(packed,  8), 0xFF),
           bit.band(packed,                 0xFF)
end
```

### Test, set, clear, toggle a bit
```lua
local function bit_test(v, n)   return bit.band(v, bit.lshift(1, n)) ~= 0 end
local function bit_set(v, n)    return bit.bor(v, bit.lshift(1, n)) end
local function bit_clear(v, n)  return bit.band(v, bit.bnot(bit.lshift(1, n))) end
local function bit_toggle(v, n) return bit.bxor(v, bit.lshift(1, n)) end
```

### Sign-extend a smaller-width value to int32
```lua
local function sign_extend(value, src_bits)
    local shift = 32 - src_bits
    return bit.arshift(bit.lshift(value, shift), shift)
end

print(sign_extend(0xFF, 8))
print(sign_extend(0x7F, 8))
```

### Hex-dump a value
```lua
print(string.format("addr = 0x%s", bit.tohex(addr, -8)))
```
