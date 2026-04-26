---
sidebar_position: 8
title: file
---

# `file`

Sandboxed filesystem access. 8 canonical functions, all single lowercase form (no aliases).

| | |
|---|---|
| **Functions** | 8 |
| **Verified live** | 8 of 8 |
| **Required event context** | none |
| **Side effects** | reads, writes, deletes, creates files and directories on disk |
| **Sandbox root** | the cheat's `files/` directory (relative paths resolve here) |

> **Single form only.** `file.read`, `file.write`, etc. No PascalCase aliases. See [Overview / Naming convention](../overview#naming-convention).

> **Binary-safe.** `file.write`/`file.read` preserve every byte including `\0`. Verified with a 7-byte payload containing nulls and high-bit bytes.

## Sandbox

Path semantics, verified live:

- **Relative paths** resolve under the cheat's `files/` directory. `file.write("data.json", json)` lands at `<cheat>/files/data.json`.
- **`..` is blocked** with a hard error: `read("../foo")` raises `"File path cannot contain '..'"`.
- **Absolute Windows paths bypass the sandbox.** `file.read("C:/Windows/win.ini")` returned the actual file contents in our verify run. Treat the sandbox as advisory, not a security boundary.
- **`write` does not create parent directories.** `file.write("subdir/inner.txt", "x")` silently returns `false` if `subdir/` does not exist. Use [`mkdir`](#mkdir) first (it is recursive).
- **Empty string `""` and no-arg both refer to the root** for `exists`, `listdir`. For `read`/`write` they error.

## Quick reference

| Function | Signature | Notes | Status |
|---|---|---|---|
| [`read`](#read)       | `(path: string) → string \| nil` | full file content as string                              | <span className="status-badge verified">verified</span> |
| [`write`](#write)     | `(path: string, content: string) → bool` | overwrites, **does NOT create parent dirs**     | <span className="status-badge verified">verified</span> |
| [`append`](#append)   | `(path: string, content: string) → bool` | appends, **creates the file if missing**         | <span className="status-badge verified">verified</span> |
| [`delete`](#delete)   | `(path: string) → bool` | true on success, false on missing or non-empty dir            | <span className="status-badge verified">verified</span> |
| [`exists`](#exists)   | `(path: string) → bool` | works on files and dirs, `""` → `true` (root)                 | <span className="status-badge verified">verified</span> |
| [`isdir`](#isdir)     | `(path: string) → bool` | true if path exists AND is a directory                        | <span className="status-badge verified">verified</span> |
| [`mkdir`](#mkdir)     | `(path: string) → bool` | **recursive**, idempotent on existing directory               | <span className="status-badge verified">verified</span> |
| [`listdir`](#listdir) | `(path?: string) → table \| nil` | array of `{name, isDirectory, isFile, size?}` records | <span className="status-badge verified">verified</span> |

---

## `read`

```lua
file.read(path: string) → string | nil
```

Returns the entire file contents as a Lua string. Binary-safe. Returns `nil` for missing files.

| Call | Result |
|---|---|
| `read("data.txt")`              | file content as string |
| `read("missing.txt")`           | `nil` (no error) |
| `read("../foo")`                | error: `"File path cannot contain '..'"` |
| `read("C:/Windows/win.ini")`    | absolute path bypasses sandbox, returns the file |
| `read()`                        | `"bad argument #1 to '?' (string expected, got no value)"` |
| `read(nil)`                     | `"bad argument #1 to '?' (string expected, got nil)"` |

```lua
local content = file.read("config.json")
if content then
    local parsed = decode_json(content)
end
```

---

## `write`

```lua
file.write(path: string, content: string) → bool
```

Writes `content` to `path`, **overwriting** any existing file. Returns `true` on success, `false` on silent failure (most commonly when the parent directory is missing).

| Call | Result |
|---|---|
| `write("file.txt", "x")`                        | `true`, file created or overwritten |
| `write("file.txt", "")`                         | `true`, empty file |
| `write("subdir/inner.txt", "x")`                | `false` if `subdir/` does not exist (silent) |
| `write("file.txt", nil)`                        | `"bad argument #2 to '?' (string expected, got nil)"` |

`write` is **binary-safe**:

```lua
file.write("payload.bin", string.char(0, 1, 2, 0xCA, 0xFE, 0xBA, 0xBE))
local back = file.read("payload.bin")
print(#back)
```

To create a file in a nested directory:

```lua
file.mkdir("logs/today")
file.write("logs/today/run.log", "...")
```

---

## `append`

```lua
file.append(path: string, content: string) → bool
```

Appends `content` to the end of the file. **Creates the file if it does not exist**, unlike `write` with a missing parent directory.

| Call | Result |
|---|---|
| `append("log.txt", "AAA"); append("log.txt", "BBB")` | file content becomes `"AAABBB"` |
| `append("brand_new.txt", "CCC")`                      | `true`, file created with content `"CCC"` |

```lua
local function log_line(line)
    file.append("session.log", string.format("[%d] %s\n",
        utility.GetTickCount(), line))
end

cheat.Register("onSlowUpdate", function()
    log_line("heartbeat")
end)
```

---

## `delete`

```lua
file.delete(path: string) → bool
```

Deletes a file or **empty** directory. Returns `true` on success, `false` on failure (missing path, non-empty directory).

| Call | Result |
|---|---|
| `delete("file.txt")`           | `true`, file removed |
| `delete("empty_dir")`          | `true`, directory removed |
| `delete("non_empty_dir")`      | `false`, directory still exists |
| `delete("missing_path")`       | `false` (silent) |
| `delete()`                     | `"bad argument #1 to '?' (string expected, got no value)"` |
| `delete(nil)`                  | `"bad argument #1 to '?' (string expected, got nil)"` |

:::warning No recursive delete
There is no built-in recursive directory removal. To delete a non-empty directory, walk it with `listdir` and delete each entry first:

```lua
local function rm_rf(path)
    if file.isdir(path) then
        for _, entry in ipairs(file.listdir(path) or {}) do
            rm_rf(path .. "/" .. entry.name)
        end
    end
    file.delete(path)
end
```
:::

---

## `exists`

```lua
file.exists(path: string) → bool
```

Returns `true` if anything (file or directory) is at `path`. `""` is treated as the sandbox root and always returns `true`.

| Call | Result |
|---|---|
| `exists("file.txt")`             | `true` if file exists |
| `exists("some_dir")`             | `true` if directory exists |
| `exists("missing")`              | `false` |
| `exists("")`                     | `true` (root) |
| `exists(123)`                    | `false` (numeric path silently false, no error) |
| `exists()`                       | `"bad argument #1 to '?' (string expected, got no value)"` |
| `exists(nil)`                    | `"bad argument #1 to '?' (string expected, got nil)"` |

---

## `isdir`

```lua
file.isdir(path: string) → bool
```

Returns `true` only if the path exists **and** points to a directory. Files and missing paths both return `false` without error.

| Call | Result |
|---|---|
| `isdir("some_dir")`     | `true` |
| `isdir("file.txt")`     | `false` |
| `isdir("missing")`      | `false` (no error) |
| `isdir(nil)`            | `"bad argument #1 to '?' (string expected, got nil)"` |

```lua
if file.isdir("logs") then

end
```

---

## `mkdir`

```lua
file.mkdir(path: string) → bool
```

Creates a directory. **Recursive**: `mkdir("a/b/c")` creates `a`, `a/b`, and `a/b/c` all at once. **Idempotent**: returns `true` if the directory already exists.

| Call | Result |
|---|---|
| `mkdir("new")`              | `true`, directory created |
| `mkdir("existing")`         | `true` (no-op, no error) |
| `mkdir("a/b/c")`            | `true`, all 3 levels created |
| `mkdir(nil)`                | `"bad argument #1 to '?' (string expected, got nil)"` |
| `isdir("a/b/c")` after      | `true` (verified) |

```lua
file.mkdir("cache/preset_v2")
file.write("cache/preset_v2/settings.json", json)
```

---

## `listdir`

```lua
file.listdir(path?: string) → table | nil
```

Lists the contents of a directory. With no arguments or `""`, lists the **sandbox root**.

Each entry in the returned array is a record:

| Field | Type | Meaning |
|---|---|---|
| `name`        | `string` | the entry's basename |
| `isDirectory` | `bool`   | `true` for subdirectories |
| `isFile`      | `bool`   | `true` for regular files |
| `size`        | `number` | byte size, **only present when `isFile == true`** |

Verified return shapes:

| Call | Result |
|---|---|
| `listdir("dir_with_3_files_1_subdir")` | array of 4 records |
| `listdir("empty_dir")`                  | `{}` (empty table, NOT nil) |
| `listdir("missing")`                    | `nil` |
| `listdir("file.txt")` (regular file)    | `nil` |
| `listdir()` or `listdir("")`            | sandbox root contents |

Example response (excerpt from a verify run, root listing):

```lua
{
  { name = "logo.png",                  isDirectory = false, isFile = true, size = 21816 },
  { name = "serotonin_api_dump_v2.json", isDirectory = false, isFile = true, size = 42954 },
  { name = "test",                      isDirectory = true,  isFile = false },

}
```

```lua
for _, entry in ipairs(file.listdir("logs") or {}) do
    if entry.isFile and entry.name:match("%.log$") then
        print(string.format("%-30s %d bytes", entry.name, entry.size))
    end
end
```

---

## Patterns

### Atomic-ish JSON config save
```lua
local function save_config(path, json)
    local tmp = path .. ".tmp"
    if file.write(tmp, json) then
        file.delete(path)

        if file.write(path, json) then
            file.delete(tmp)
            return true
        end
    end
    return false
end
```

### Recursive directory walk
```lua
local function walk(dir, fn)
    for _, entry in ipairs(file.listdir(dir) or {}) do
        local full = dir == "" and entry.name or (dir .. "/" .. entry.name)
        if entry.isDirectory then
            walk(full, fn)
        else
            fn(full, entry)
        end
    end
end

walk("", function(path, entry)
    print(path, entry.size)
end)
```

### Read-or-default
```lua
local function read_or(path, default)
    return file.read(path) or default
end

local cfg_text = read_or("settings.json", "{}")
```

### Logger with rotation
```lua
local LOG = "session.log"
local MAX = 1024 * 1024

local function log(line)
    local entry = file.listdir("")

    local size = 0
    for _, e in ipairs(entry or {}) do
        if e.name == LOG and e.isFile then size = e.size; break end
    end
    if size > MAX then
        file.delete(LOG .. ".old")

        local content = file.read(LOG)
        if content then file.write(LOG .. ".old", content) end
        file.delete(LOG)
    end
    file.append(LOG, string.format("[%d] %s\n", utility.GetTickCount(), line))
end
```

### Recursive delete (no built-in)
```lua
local function rm_rf(path)
    if file.isdir(path) then
        for _, entry in ipairs(file.listdir(path) or {}) do
            rm_rf(path .. "/" .. entry.name)
        end
    end
    file.delete(path)
end
```
