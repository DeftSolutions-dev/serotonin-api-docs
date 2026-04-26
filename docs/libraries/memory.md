---
sidebar_position: 2
title: memory
---

# `memory`

Direct read / write / pattern scan / address validation on the Roblox process address space. 6 canonical functions.

| | |
|---|---|
| **Functions** | 6 (14 with aliases) |
| **Verified live** | 5 of 6 (Write is partial: documented from dump but not roundtripped for safety) |
| **Required event context** | none |
| **Side effects** | `Write` mutates process memory and can crash the game with a wrong address or type |

> **Aliases.** Two-word names have three forms (`memory.GetBase` / `getBase` / `get_base`). The four single-word verbs (`Read`, `Write`, `Scan`, `Rebase`) have only two: PascalCase + lowercase (`memory.Read` / `memory.read`). See [Overview / Naming convention](../overview#naming-convention).

## Quick reference

| Function | Signature | Notes | Status |
|---|---|---|---|
| [`GetBase`](#getbase)   | `() → number`                                       | base virtual address of the Roblox executable | <span className="status-badge verified">verified</span> |
| [`Rebase`](#rebase)     | `(offset: number) → number`                         | shorthand for `GetBase() + offset`            | <span className="status-badge verified">verified</span> |
| [`IsValid`](#isvalid)   | `(addr: number) → bool`                             | true if `addr` is a readable virtual page     | <span className="status-badge verified">verified</span> |
| [`Read`](#read)         | `(type: string, addr: number) → value`              | typed read, see type table below              | <span className="status-badge verified">verified</span> |
| [`Write`](#write)       | `(type: string, addr: number, value)`               | typed write, same types as Read               | <span className="status-badge partial">partial</span> |
| [`Scan`](#scan)         | `(pattern: string, [module: string]) → number \| table` | first hit when no module, all hits in module otherwise | <span className="status-badge verified">verified</span> |

## Supported types for Read / Write

Re-verified live by reading each type from the start of the Roblox executable (byte at `base = 0x4D = 'M'`). The list below is the **exhaustive** set of accepted type strings - every other variant raises `"Invalid memory type for read: '<name>'"`.

| Type | What it reads | Verified return |
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
| `bool`    | 1 byte, non-zero = true               | `true` |
| `string`  | C-string (NUL-terminated)             | `""` at the PE header. `string` reads until a `0x00` byte. Quirky on raw memory, prefer `byte`-loops for known layouts |
| `ptr`     | 8-byte pointer (alias of `pointer`)   | `12894362189` |
| `pointer` | 8-byte pointer                        | `12894362189` |
| `vector2` | Roblox `Vector2` userdata (8 bytes)   | userdata from raw memory |
| `vector3` | Roblox `Vector3` userdata (12 bytes)  | userdata `(0, 0, 0)` from raw memory |
| `color3`  | Color triple (multi-return)           | `r, g, b` as 3 numbers (0..255), e.g. `0, 0, 0` from a zero-filled region |
| `cframe`  | Roblox `CFrame`-shaped Lua table      | table from raw memory |

17 type strings accepted. Verified live in build `version-390ba09e7e944154`.

:::danger These type strings are NOT bound - verified rejected
Direct probe with the API verifier returns `"Invalid memory type for read: '<name>'"` for every name below. Use the canonical entry from the table above instead.

| Rejected | Use instead |
|---|---|
| `dword` | `uint` (32-bit unsigned) |
| `qword` | `uint64` |
| `long`, `longlong` | `int64` |
| `int8`, `int16`, `int32` | `byte`, `short`, `int` |
| `uint8`, `uint16`, `uint32` | `byte`, `ushort`, `uint` |
:::

The Roblox-specific types (`vector2`, `vector3`, `color3`, `cframe`) read raw bytes and reinterpret them as the corresponding Roblox struct. Reading them from random memory (like the PE header above) produces zero-filled values. Use them only on addresses where a real Roblox structure lives.

`color3` is unusual - it is the only Read type that returns **three values** (multi-return `r, g, b`, each `0..255`) rather than a single userdata. Capture it as `local r, g, b = memory.Read("color3", addr)`.

`int` and `int64` are signed and may return **negative** values when the high bit is set; if you need an unsigned interpretation, use `uint` / `uint64`.

---

## `GetBase`

```lua
memory.GetBase() → number
```

Returns the virtual address of the loaded Roblox executable's base.

Verified live: `0x7FF64E430000` (the value will differ each launch due to ASLR). The first two bytes at this address are `0x4D 0x5A` = `MZ`, the standard PE/MS-DOS header signature, confirming this is indeed the executable image base.

```lua
local base = memory.GetBase()
print(string.format("Roblox base: 0x%X", base))
```

---

## `Rebase`

```lua
memory.Rebase(offset: number) → number
```

Shortcut for `GetBase() + offset`. Use it to convert a known module-relative offset (the kind you get from a static IDA / Ghidra analysis) into a runtime virtual address.

Verified:
- `Rebase(0)`     equals `GetBase()`
- `Rebase(0x1000)` equals `GetBase() + 0x1000`

```lua
local addr = memory.Rebase(0x12340)
local value = memory.Read("int", addr)
```

---

## `IsValid`

```lua
memory.IsValid(addr: number) → bool
```

Returns `true` if `addr` falls inside a readable virtual memory page in the Roblox process. Used to gate reads so you do not crash on unmapped memory.

Verified probes:

| Address | Result |
|---|---|
| `0`                  | `false` |
| `base`               | `true`  |
| `base - 1`           | `false` (right at the boundary) |
| `base + 0x100`       | `true`  |
| `0xDEADBEEF`         | `false` |
| `0x7FFFFFFFFFFF`     | `false` (max user-space address) |
| any low-mapped `Scan("4D 5A")` first hit | `true`  (first hit points into a system module that holds another `MZ` header. The exact address is ASLR-shifted per launch) |

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

Reads `type` bytes starting at virtual address `addr`. See the [Supported types](#supported-types-for-read--write) table above for accepted type strings and what each returns.

The type list is exact: `int8` / `int16` / `int32` / `uint8` / `uint16` / `uint32` / `dword` / `qword` / `long` / `longlong` and any other variant do **not** work and return error `"Invalid memory type for read: '<name>'"` (re-verified live). Use only the 17 canonical names from the table above.

```lua
local base = memory.GetBase()
local b1 = memory.Read("byte", base)
local b2 = memory.Read("byte", base + 1)
local lfanew = memory.Read("int", base + 0x3C)
print(string.format("MZ: %c%c, PE offset: 0x%X", b1, b2, lfanew))
```

The pointer types (`ptr`, `pointer`) read 8 bytes and return them as a `number`. Validate with `IsValid(...)` before dereferencing.

---

## `Write`

```lua
memory.Write(type: string, addr: number, value)
```

Writes `value` of `type` to `addr`. Accepts the **same 17 type strings** as [`Read`](#read). Verified live: invalid type names raise `"Invalid memory type for write: '<name>'"` (note: `for write`, not `for read` - the error string mirrors the function called).

:::danger Untested with a real address, can crash the process
We did not roundtrip `Write` against a live target in this audit because a wrong address or wrong type can corrupt running Roblox state and crash the game (or worse, send corrupt data to the server). Type-rejection was verified by passing invalid type strings. Actual mutation was not tested.

Use only on addresses whose layout you have already mapped, and gate every call with `IsValid` plus a sanity Read-back check.

Recommended pattern:

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

AOB (array-of-bytes) signature scanner. Pattern is a space-separated hex string. `??` is a wildcard byte. Returned values are **absolute virtual addresses**, not module-relative offsets.

| Arg | Type | Default | Meaning |
|---|---|---|---|
| `pattern`   | string  | required          | space-separated hex with `??` wildcards |
| `returnAll` | bool    | `false`           | `false` → return first hit as a number; `true` → return all hits as a table |
| `limit`     | number  | unlimited         | cap how many results to collect when `returnAll=true`. `0`, negative, or very large values are treated as **unlimited** (verified live) |
| `module`    | string  | whole process     | restrict scan to a named module - see exact-match rule below |

Verified return shapes (concrete addresses + counts are session- and ASLR-specific, only the **shape** is stable across runs):

| Call | Return shape | Notes |
|---|---|---|
| `Scan("4D 5A")`                  | `number`              | first absolute address matching MZ in process memory |
| `Scan("4D 5A", false)`           | `number`              | same as above (explicit `returnAll=false`) |
| `Scan("4D 5A", true)`            | `table` of numbers    | all hits, unlimited |
| `Scan("4D 5A", true, 5)`         | `table` of 5 numbers  | first 5 hits |
| `Scan("4D 5A", true, 0)`         | `table` of all hits   | `0` = unlimited (verified live) |
| `Scan("4D 5A", true, -1)`        | `table` of all hits   | negative = unlimited |
| `Scan("4D 5A", false, 1, "ntdll.dll")`   | `number`     | first MZ in `ntdll.dll`'s mapped range |
| `Scan("4D 5A", false, 1, "kernel32.dll")`| `number`     | first MZ in `kernel32.dll` |
| `Scan("4D 5A", false, 1, "user32.dll")`  | `number`     | first MZ in `user32.dll` |
| `Scan("4D 5A", false, 1, "RobloxPlayerBeta.exe")` | nothing | scan completed but returned no hit (the cheat's MZ-match in this module's range did not produce a result in our run; investigate per-build) |
| `Scan("4D 5A", false, 1, "ntdll")` | error | `"Failed to find module for memory scan: ntdll"` - module name must include the file extension |
| `Scan("4D 5A", false, 1, "Roblox")`| error | `"Failed to find module for memory scan: Roblox"` - substring of a real module name is **not** accepted |
| `Scan("4D 5A", false, 1, "")`      | error | `"Failed to find module for memory scan: "` |

:::warning Module name must be exact
Verified live: the `module` string must be the **full** module file name as it appears in the loaded-modules table (`"ntdll.dll"`, `"kernel32.dll"`, `"user32.dll"`, `"RobloxPlayerBeta.exe"`). Substrings (`"ntdll"`, `"Roblox"`) and missing extensions are **rejected** with `"Failed to find module for memory scan: <name>"`. The `.dll` / `.exe` extension is required.
:::

The single-arg / `returnAll=false` form returns the **first** absolute address matching the pattern, or nothing. The `returnAll=true` form returns an **array** of absolute addresses with `#table` count, capped by `limit` if given (or unlimited if `limit` is `0`/negative/missing).

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

:::tip Pattern syntax
- Bytes are uppercase or lowercase hex, two chars each
- Separated by single spaces
- `??` is the wildcard byte (matches anything)
- Invalid hex (anything outside `0-9 A-F`) raises `Invalid byte in pattern: XX`
:::

---

## Patterns

### Read PE header
```lua
local base = memory.GetBase()
local b1 = memory.Read("byte", base)
local b2 = memory.Read("byte", base + 1)
local lfanew = memory.Read("uint", base + 0x3C)
local pe_sig = memory.Read("uint", base + lfanew)
print(string.format("MZ: %c%c, PE offset: 0x%X, PE sig: 0x%X",
    b1, b2, lfanew, pe_sig))
```

### Resolve a static offset to runtime address
```lua
local STATIC_OFFSET = 0x4A12C0
local addr = memory.Rebase(STATIC_OFFSET)
if memory.IsValid(addr) then
    local v = memory.Read("uint64", addr)
    print(string.format("game state: 0x%X", v))
end
```

### Find a function by AOB pattern
```lua
local pat = "48 89 5C 24 08 57 48 83 EC 20 48 8B 05 ?? ?? ?? ??"
local fn_addr = memory.Scan(pat)
if fn_addr then
    print(string.format("function: 0x%X", fn_addr))
end
```

### Walk a pointer chain
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
