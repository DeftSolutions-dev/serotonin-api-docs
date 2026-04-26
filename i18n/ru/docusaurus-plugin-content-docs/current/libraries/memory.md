---
sidebar_position: 2
title: memory
---

# `memory`

Прямое чтение / запись / pattern-сканирование / валидация адреса в адресном пространстве Roblox-процесса. 6 канонических функций.

| | |
|---|---|
| **Функций** | 6 (14 с алиасами) |
| **Проверено вживую** | 5 из 6 (Write частично: задокументирован из dump, без roundtrip ради безопасности) |
| **Требуемый event** | нет |
| **Сайд-эффекты** | `Write` мутирует память процесса и может крашнуть игру при неверном адресе или типе |

> **Алиасы.** Двусоставные имена имеют три формы (`memory.GetBase` / `getBase` / `get_base`). Четыре однословных глагола (`Read`, `Write`, `Scan`, `Rebase`) имеют только две: PascalCase + lowercase (`memory.Read` / `memory.read`). См. [Обзор / Конвенция именования](../overview#конвенция-именования).

## Краткий справочник

| Функция | Сигнатура | Заметка | Статус |
|---|---|---|---|
| [`GetBase`](#getbase)   | `() → number`                                       | базовый виртуальный адрес Roblox-исполняемого  | <span className="status-badge verified">проверено</span> |
| [`Rebase`](#rebase)     | `(offset: number) → number`                         | сокращение для `GetBase() + offset`            | <span className="status-badge verified">проверено</span> |
| [`IsValid`](#isvalid)   | `(addr: number) → bool`                             | true если `addr` лежит в читаемой странице     | <span className="status-badge verified">проверено</span> |
| [`Read`](#read)         | `(type: string, addr: number) → value`              | типизированное чтение, см. таблицу типов ниже  | <span className="status-badge verified">проверено</span> |
| [`Write`](#write)       | `(type: string, addr: number, value)`               | типизированная запись, те же типы что Read     | <span className="status-badge partial">частично</span> |
| [`Scan`](#scan)         | `(pattern: string, [module: string]) → number \| table` | первый хит без модуля, все хиты в модуле иначе | <span className="status-badge verified">проверено</span> |

## Поддерживаемые типы для Read / Write

Перепроверено вживую чтением каждого типа с начала Roblox-исполняемого (byte по `base = 0x4D = 'M'`). Список ниже - **исчерпывающий** набор принимаемых строк типа; любой другой вариант поднимает `"Invalid memory type for read: '<name>'"`.

| Тип | Что читает | Проверенный возврат |
|---|---|---|
| `byte`    | 1 unsigned byte                       | `77` (=`0x4D` = `'M'`) |
| `short`   | 2-byte signed (little-endian)         | `23117` (=`0x5A4D` = `"MZ"`) |
| `ushort`  | 2-byte unsigned                       | `23117` |
| `int`     | 4-byte signed                         | `9460301` (=`0x00905A4D`) |
| `uint`    | 4-byte unsigned                       | `9460301` |
| `int64`   | 8-byte signed                         | `12894362189` |
| `uint64`  | 8-byte unsigned                       | `12894362189` |
| `float`   | 4-byte IEEE 754                       | `1.3256705263351e-38` |
| `double`  | 8-byte IEEE 754                       | `6.3706613826192e-314` |
| `bool`    | 1 byte, ненулевое = true              | `true` |
| `string`  | C-строка (NUL-terminated)             | `""` на PE-header. `string` читает до байта `0x00`. Quirky на raw memory, предпочитай `byte`-циклы для известного layout'а |
| `ptr`     | 8-byte pointer (alias `pointer`)      | `12894362189` |
| `pointer` | 8-byte pointer                        | `12894362189` |
| `vector2` | Roblox `Vector2` userdata (8 байт)    | userdata из raw memory |
| `vector3` | Roblox `Vector3` userdata (12 байт)   | userdata `(0, 0, 0)` из raw memory |
| `color3`  | Color triple (multi-return)           | `r, g, b` как 3 числа (0..255), например `0, 0, 0` из zero-filled региона |
| `cframe`  | Roblox `CFrame`-shaped Lua table      | table из raw memory |

17 строк типов принимаются. Перепроверено вживую в билде `version-390ba09e7e944154`.

:::danger Эти строки типов НЕ привязаны - проверено отвергнуто
Прямой пробой через API verifier возвращает `"Invalid memory type for read: '<name>'"` для каждого имени ниже. Используй каноничный вариант из таблицы выше.

| Отвергнут | Используй вместо |
|---|---|
| `dword` | `uint` (32-bit unsigned) |
| `qword` | `uint64` |
| `long`, `longlong` | `int64` |
| `int8`, `int16`, `int32` | `byte`, `short`, `int` |
| `uint8`, `uint16`, `uint32` | `byte`, `ushort`, `uint` |
:::

Roblox-специфичные типы (`vector2`, `vector3`, `color3`, `cframe`) читают raw байты и реинтерпретируют их как соответствующую Roblox-структуру. Чтение из случайной памяти (как PE header выше) даёт zero-filled значения. Используй только на адресах где лежит реальная Roblox-структура.

`color3` - необычный: единственный Read-тип возвращающий **три значения** (multi-return `r, g, b`, каждое `0..255`), а не одно userdata. Лови как `local r, g, b = memory.Read("color3", addr)`.

`int` и `int64` знаковые и могут вернуть **отрицательное** значение когда старший бит установлен; если нужна unsigned-интерпретация - используй `uint` / `uint64`.

---

## `GetBase`

```lua
memory.GetBase() → number
```

Возвращает виртуальный адрес базы загруженного Roblox-исполняемого.

Проверено вживую: `0x7FF64E430000` (значение разное при каждом запуске из-за ASLR). Первые два байта по этому адресу `0x4D 0x5A` = `MZ`, стандартная PE/MS-DOS header signature, что подтверждает что это именно базa executable image.

```lua
local base = memory.GetBase()
print(string.format("Roblox base: 0x%X", base))
```

---

## `Rebase`

```lua
memory.Rebase(offset: number) → number
```

Сокращение для `GetBase() + offset`. Используй чтобы превратить известный module-relative offset (из статического анализа в IDA / Ghidra) в runtime virtual address.

Проверено:
- `Rebase(0)`     равно `GetBase()`
- `Rebase(0x1000)` равно `GetBase() + 0x1000`

```lua
local addr = memory.Rebase(0x12340)
local value = memory.Read("int", addr)
```

---

## `IsValid`

```lua
memory.IsValid(addr: number) → bool
```

Возвращает `true` если `addr` попадает в читаемую виртуальную страницу Roblox-процесса. Используй чтобы предотвращать чтения по unmapped memory которые крашат игру.

Проверенные probes:

| Адрес | Результат |
|---|---|
| `0`                  | `false` |
| `base`               | `true`  |
| `base - 1`           | `false` (прямо на границе) |
| `base + 0x100`       | `true`  |
| `0xDEADBEEF`         | `false` |
| `0x7FFFFFFFFFFF`     | `false` (max user-space address) |
| любой low-mapped `Scan("4D 5A")` первый хит | `true`  (указывает в системный модуль с другим `MZ` header. Точный адрес ASLR-shifted каждый запуск) |

```lua
local addr = memory.Rebase(0x12340)
if memory.IsValid(addr) then
    local v = memory.Read("int", addr)
end
```

---

## `Read`

```lua
memory.Read(type: string, addr: number) → value
```

Читает `type` байт начиная с виртуального адреса `addr`. См. таблицу [Поддерживаемые типы](#поддерживаемые-типы-для-read--write) выше для принимаемых строк типа и того что каждый возвращает.

Список типов точный: `int8` / `int16` / `int32` / `uint8` / `uint16` / `uint32` / `dword` / `qword` / `long` / `longlong` и любой другой вариант **не** работают и возвращают error `"Invalid memory type for read: '<name>'"` (перепроверено вживую). Используй только 17 канонических имён из таблицы выше.

```lua
local base = memory.GetBase()
local b1 = memory.Read("byte", base)
local b2 = memory.Read("byte", base + 1)
local lfanew = memory.Read("int", base + 0x3C)
print(string.format("MZ: %c%c, PE offset: 0x%X", b1, b2, lfanew))
```

Pointer-типы (`ptr`, `pointer`) читают 8 байт и возвращают как `number`. Валидируй через `IsValid(...)` перед dereference.

---

## `Write`

```lua
memory.Write(type: string, addr: number, value)
```

Записывает `value` типа `type` по `addr`. Принимает **те же 17 строк типов** что и [`Read`](#read). Проверено вживую: невалидные имена типов поднимают `"Invalid memory type for write: '<name>'"` (заметь: `for write`, не `for read` - error string зеркалит вызванную функцию).

:::danger Не roundtripped с реальным адресом, может крашнуть процесс
Мы не делали roundtrip `Write` против live-target'а в этом аудите потому что неверный адрес или тип может повредить running Roblox state и крашнуть игру (или хуже, послать corrupt data на сервер). Type-rejection проверен передачей невалидных строк типа. Реальная мутация не тестировалась.

Используй только на адресах layout которых ты уже размечал, и гетируй каждый вызов через `IsValid` плюс sanity Read-back.

Рекомендуемый паттерн:

```lua
if memory.IsValid(addr) then
    local before = memory.Read("int", addr)
    memory.Write("int", addr, new_value)
    local after = memory.Read("int", addr)
    print(string.format("0x%X: 0x%X -> 0x%X", addr, before, after))
end
```
:::

---

## `Scan`

```lua
memory.Scan(pattern: string,
            returnAll?: bool,
            limit?: number,
            module?: string) → number | table | nil
```

AOB (array-of-bytes) signature scanner. Pattern это hex-строка через пробел. `??` это байт-wildcard. Возвращаемые значения это **абсолютные виртуальные адреса**, не module-relative offsets.

| Аргумент | Тип | По умолчанию | Значение |
|---|---|---|---|
| `pattern`   | string  | обязателен        | hex через пробел с `??` wildcards |
| `returnAll` | bool    | `false`           | `false` → первый хит как number; `true` → все хиты как table |
| `limit`     | number  | unlimited         | макс. число результатов когда `returnAll=true`. `0`, отрицательные и очень большие значения трактуются как **unlimited** (проверено вживую) |
| `module`    | string  | весь процесс      | ограничить скан модулем - см. правило точного совпадения ниже |

Проверенные return shapes (конкретные адреса и counts session- и ASLR-specific, стабильна только **shape**):

| Вызов | Return shape | Заметка |
|---|---|---|
| `Scan("4D 5A")`                  | `number`              | первый абсолютный адрес matching MZ в памяти процесса |
| `Scan("4D 5A", false)`           | `number`              | то же что выше (явный `returnAll=false`) |
| `Scan("4D 5A", true)`            | `table` of numbers    | все хиты, без лимита |
| `Scan("4D 5A", true, 5)`         | `table` из 5 numbers  | первые 5 хитов |
| `Scan("4D 5A", true, 0)`         | `table` всех хитов    | `0` = unlimited (проверено вживую) |
| `Scan("4D 5A", true, -1)`        | `table` всех хитов    | отрицательное = unlimited |
| `Scan("4D 5A", false, 1, "ntdll.dll")`   | `number`     | первый MZ в mapped-диапазоне `ntdll.dll` |
| `Scan("4D 5A", false, 1, "kernel32.dll")`| `number`     | первый MZ в `kernel32.dll` |
| `Scan("4D 5A", false, 1, "user32.dll")`  | `number`     | первый MZ в `user32.dll` |
| `Scan("4D 5A", false, 1, "RobloxPlayerBeta.exe")` | nothing | скан завершился но не вернул хит (cheat-MZ-match в диапазоне этого модуля не дал результата в нашем прогоне; проверь per-build) |
| `Scan("4D 5A", false, 1, "ntdll")` | error | `"Failed to find module for memory scan: ntdll"` - имя модуля должно включать расширение |
| `Scan("4D 5A", false, 1, "Roblox")`| error | `"Failed to find module for memory scan: Roblox"` - substring реального имени модуля **не** принимается |
| `Scan("4D 5A", false, 1, "")`      | error | `"Failed to find module for memory scan: "` |

:::warning Имя модуля должно быть точным
Проверено вживую: строка `module` должна быть **полным** именем файла модуля как оно появляется в loaded-modules таблице (`"ntdll.dll"`, `"kernel32.dll"`, `"user32.dll"`, `"RobloxPlayerBeta.exe"`). Substrings (`"ntdll"`, `"Roblox"`) и пропущенные расширения **отвергаются** с `"Failed to find module for memory scan: <name>"`. Расширение `.dll` / `.exe` обязательно.
:::

Single-arg / `returnAll=false` форма возвращает **первый** абсолютный адрес matching pattern, или ничего. `returnAll=true` форма возвращает **массив** абсолютных адресов с `#table` count, ограниченный `limit` если задан (или unlimited если `limit` это `0`/отрицательное/отсутствует).

```lua
local addr = memory.Scan("48 8B 05 ?? ?? ?? ?? 48 8B 88")
if addr and memory.IsValid(addr) then
    local disp = memory.Read("int", addr + 3)
    local target = addr + 7 + disp
    print(string.format("resolved RIP-relative target: 0x%X", target))
end
```

```lua
local hits = memory.Scan("E8 ?? ?? ?? ?? 90 90", "RobloxPlayerBeta.exe")
print(string.format("found %d call sites", #hits))
for i, a in ipairs(hits) do
    if i <= 5 then print(string.format("  [%d] = 0x%X", i, a)) end
end
```

:::tip Синтаксис паттерна
- Байты в верхнем или нижнем регистре hex, по 2 символа
- Разделены одиночными пробелами
- `??` это wildcard байт (matches anything)
- Невалидный hex (что-то вне `0-9 A-F`) raise'ит `Invalid byte in pattern: XX`
:::

---

## Паттерны

### Чтение PE header
```lua
local base = memory.GetBase()
local b1 = memory.Read("byte", base)
local b2 = memory.Read("byte", base + 1)
local lfanew = memory.Read("int", base + 0x3C)
local pe_sig = memory.Read("uint", base + lfanew)
print(string.format("MZ: %c%c, PE offset: 0x%X, PE sig: 0x%X",
    b1, b2, lfanew, pe_sig))
```

### Резолв static offset в runtime address
```lua
local STATIC_OFFSET = 0x4A12C0
local addr = memory.Rebase(STATIC_OFFSET)
if memory.IsValid(addr) then
    local v = memory.Read("uint64", addr)
    print(string.format("game state: 0x%X", v))
end
```

### Поиск функции по AOB паттерну
```lua
local pat = "48 89 5C 24 08 57 48 83 EC 20 48 8B 05 ?? ?? ?? ??"
local fn_addr = memory.Scan(pat)
if fn_addr then
    print(string.format("function: 0x%X", fn_addr))
end
```

### Walk pointer chain
```lua
local function follow(addr, offsets)
    for _, off in ipairs(offsets) do
        if not memory.IsValid(addr) then return nil end
        addr = memory.Read("ptr", addr) + off
    end
    return addr
end

local final = follow(memory.Rebase(0x12340), { 0x10, 0x28, 0x0 })
```
