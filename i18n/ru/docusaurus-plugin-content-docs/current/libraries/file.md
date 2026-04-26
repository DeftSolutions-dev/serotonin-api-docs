---
sidebar_position: 8
title: file
---

# `file`

Sandbox-доступ к файловой системе. 8 канонических функций, все single-form lowercase (без алиасов).

| | |
|---|---|
| **Функций** | 8 |
| **Проверено вживую** | 8 из 8 |
| **Требуемый event** | нет |
| **Сайд-эффекты** | читает, пишет, удаляет, создаёт файлы и директории на диске |
| **Sandbox-корень** | директория `files/` чита (relative paths резолвятся сюда) |

> **Только single form.** `file.read`, `file.write` и т.д. Без PascalCase алиасов. См. [Обзор / Конвенция именования](../overview#конвенция-именования).

> **Binary-safe.** `file.write`/`file.read` сохраняют каждый байт включая `\0`. Проверено на 7-byte payload с null-байтами и high-bit байтами.

## Sandbox

Семантика путей, проверено вживую:

- **Relative-пути** резолвятся под директорией `files/` чита. `file.write("data.json", json)` приземляется в `<cheat>/files/data.json`.
- **`..` блокирован** жёсткой ошибкой: `read("../foo")` raise'ит `"File path cannot contain '..'"`.
- **Абсолютные Windows-пути обходят sandbox.** `file.read("C:/Windows/win.ini")` вернул реальный контент файла в нашем verify-прогоне. Считай sandbox advisory, не security-границей.
- **`write` НЕ создаёт parent directories.** `file.write("subdir/inner.txt", "x")` молча возвращает `false` если `subdir/` не существует. Используй сначала [`mkdir`](#mkdir) (он рекурсивен).
- **Пустая строка `""` и no-arg оба означают root** для `exists`, `listdir`. Для `read`/`write` это error.

## Краткий справочник

| Функция | Сигнатура | Заметка | Статус |
|---|---|---|---|
| [`read`](#read)       | `(path: string) → string \| nil` | полный контент файла как строка                            | <span className="status-badge verified">проверено</span> |
| [`write`](#write)     | `(path: string, content: string) → bool` | overwrite, **НЕ создаёт parent dirs**             | <span className="status-badge verified">проверено</span> |
| [`append`](#append)   | `(path: string, content: string) → bool` | append, **создаёт файл если missing**             | <span className="status-badge verified">проверено</span> |
| [`delete`](#delete)   | `(path: string) → bool` | true на успех, false на missing или non-empty dir              | <span className="status-badge verified">проверено</span> |
| [`exists`](#exists)   | `(path: string) → bool` | работает на файлах и директориях, `""` → `true` (root)         | <span className="status-badge verified">проверено</span> |
| [`isdir`](#isdir)     | `(path: string) → bool` | true если path существует И является directory                 | <span className="status-badge verified">проверено</span> |
| [`mkdir`](#mkdir)     | `(path: string) → bool` | **рекурсивен**, идемпотентен на existing directory             | <span className="status-badge verified">проверено</span> |
| [`listdir`](#listdir) | `(path?: string) → table \| nil` | массив записей `{name, isDirectory, isFile, size?}`    | <span className="status-badge verified">проверено</span> |

---

## `read`

```lua
file.read(path: string) → string | nil
```

Возвращает весь контент файла как Lua-строку. Binary-safe. Возвращает `nil` для отсутствующих файлов.

| Вызов | Результат |
|---|---|
| `read("data.txt")`              | контент файла как строка |
| `read("missing.txt")`           | `nil` (без error) |
| `read("../foo")`                | error: `"File path cannot contain '..'"` |
| `read("C:/Windows/win.ini")`    | абсолютный путь обходит sandbox, возвращает файл |
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

Записывает `content` в `path`, **перезаписывая** существующий файл. Возвращает `true` на успех, `false` на silent fail (чаще всего отсутствует parent directory).

| Вызов | Результат |
|---|---|
| `write("file.txt", "x")`                        | `true`, файл создан или перезаписан |
| `write("file.txt", "")`                         | `true`, пустой файл |
| `write("subdir/inner.txt", "x")`                | `false` если `subdir/` не существует (silent) |
| `write("file.txt", nil)`                        | `"bad argument #2 to '?' (string expected, got nil)"` |

`write` **binary-safe**:

```lua
file.write("payload.bin", string.char(0, 1, 2, 0xCA, 0xFE, 0xBA, 0xBE))
local back = file.read("payload.bin")
print(#back)
```

Чтобы создать файл во вложенной директории:

```lua
file.mkdir("logs/today")
file.write("logs/today/run.log", "...")
```

---

## `append`

```lua
file.append(path: string, content: string) → bool
```

Добавляет `content` в конец файла. **Создаёт файл если не существует**, в отличие от `write` с missing parent dir.

| Вызов | Результат |
|---|---|
| `append("log.txt", "AAA"); append("log.txt", "BBB")` | контент файла становится `"AAABBB"` |
| `append("brand_new.txt", "CCC")`                      | `true`, файл создан с контентом `"CCC"` |

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

Удаляет файл или **пустую** директорию. Возвращает `true` на успех, `false` на failure (отсутствующий path, non-empty directory).

| Вызов | Результат |
|---|---|
| `delete("file.txt")`           | `true`, файл удалён |
| `delete("empty_dir")`          | `true`, директория удалена |
| `delete("non_empty_dir")`      | `false`, директория всё ещё есть |
| `delete("missing_path")`       | `false` (silent) |
| `delete()`                     | `"bad argument #1 to '?' (string expected, got no value)"` |
| `delete(nil)`                  | `"bad argument #1 to '?' (string expected, got nil)"` |

:::warning Нет рекурсивного удаления
Нет встроенного recursive directory removal. Чтобы удалить non-empty directory, walk её через `listdir` и удаляй каждую запись:

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

Возвращает `true` если что-то (файл или directory) находится по `path`. `""` трактуется как sandbox root и всегда возвращает `true`.

| Вызов | Результат |
|---|---|
| `exists("file.txt")`             | `true` если файл существует |
| `exists("some_dir")`             | `true` если директория существует |
| `exists("missing")`              | `false` |
| `exists("")`                     | `true` (root) |
| `exists(123)`                    | `false` (числовой path молча false, без error) |
| `exists()`                       | `"bad argument #1 to '?' (string expected, got no value)"` |
| `exists(nil)`                    | `"bad argument #1 to '?' (string expected, got nil)"` |

---

## `isdir`

```lua
file.isdir(path: string) → bool
```

Возвращает `true` только если path существует **и** указывает на directory. Файлы и missing paths возвращают `false` без error.

| Вызов | Результат |
|---|---|
| `isdir("some_dir")`     | `true` |
| `isdir("file.txt")`     | `false` |
| `isdir("missing")`      | `false` (без error) |
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

Создаёт directory. **Рекурсивен**: `mkdir("a/b/c")` создаёт `a`, `a/b`, и `a/b/c` за один раз. **Идемпотентен**: возвращает `true` если directory уже существует.

| Вызов | Результат |
|---|---|
| `mkdir("new")`              | `true`, directory создан |
| `mkdir("existing")`         | `true` (no-op, без error) |
| `mkdir("a/b/c")`            | `true`, все 3 уровня созданы |
| `mkdir(nil)`                | `"bad argument #1 to '?' (string expected, got nil)"` |
| `isdir("a/b/c")` после      | `true` (проверено) |

```lua
file.mkdir("cache/preset_v2")
file.write("cache/preset_v2/settings.json", json)
```

---

## `listdir`

```lua
file.listdir(path?: string) → table | nil
```

Перечисляет содержимое directory. Без аргументов или `""` перечисляет **sandbox root**.

Каждая запись в возвращаемом массиве:

| Поле | Тип | Значение |
|---|---|---|
| `name`        | `string` | basename записи |
| `isDirectory` | `bool`   | `true` для subdirectories |
| `isFile`      | `bool`   | `true` для обычных файлов |
| `size`        | `number` | размер в байтах, **только если `isFile == true`** |

Проверенные return shapes:

| Вызов | Результат |
|---|---|
| `listdir("dir_with_3_files_1_subdir")` | массив из 4 записей |
| `listdir("empty_dir")`                  | `{}` (пустая таблица, НЕ nil) |
| `listdir("missing")`                    | `nil` |
| `listdir("file.txt")` (обычный файл)    | `nil` |
| `listdir()` или `listdir("")`           | sandbox root содержимое |

Пример ответа (выдержка из verify-прогона, root listing):

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

## Паттерны

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

### Рекурсивный обход директорий
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

### Logger с ротацией
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

### Recursive delete (нет built-in)
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
