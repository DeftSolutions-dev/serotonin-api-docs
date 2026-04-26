---
sidebar_position: 99
title: Для tools и агентов
---

# Подключи этот reference к своим инструментам

Три способа сложить документацию в свой инструмент, в порядке возрастания glue-кода который придётся написать.

| Тебе нужно | Используй | Сколько кода |
|---|---|---|
| Полный doc-set одним markdown-блобом для context window | [`llms-full.md`](#single-file-dump-llms-fullmd) | ноль |
| Индекс страниц с одно-строчными summary для fetch-only клиента | [`llms.txt`](#index-file-llmstxt) | ноль |
| Live MCP-tools чтобы агент сам search'ил и pull'ил страницы | [`mcp-serotonin-docs`](#mcp-server-mcp-serotonin-docs) | одна строка config'а |

Все три публичные, бесплатные, без аутентификации.

## Single-file dump (`llms-full.md`)

Весь reference (все libraries + примеры + crash-triggers + userdata) одним большим markdown-файлом, готов к paste'у в context window модели.

```
https://deftsolutions-dev.github.io/serotonin-api-docs/llms-full.md
```

Используй когда хочешь чтобы consumer знал весь API заранее и никогда не re-fetch'ил.

## Index file (`llms.txt`)

Соответствует [llmstxt.org spec](https://llmstxt.org/). Содержит описание проекта плюс плоский список всех doc-страниц с ссылками и одно-строчными summary.

```
https://deftsolutions-dev.github.io/serotonin-api-docs/llms.txt
```

Используй когда consumer должен fetch'ить только нужные страницы. Парь с generic fetch-MCP-сервером вроде [`@modelcontextprotocol/server-fetch`](https://www.npmjs.com/package/@modelcontextprotocol/server-fetch) или любым HTTP-клиентом.

## MCP server (`mcp-serotonin-docs`)

Stdio MCP-сервер опубликованный как npm-пакет. Оборачивает docs в четыре tools которые MCP-клиент может звать напрямую. Никакой удалённой инфраструктуры: `npx` тянет пакет, сервер крутится локально на машине consumer'а, каждый tool-call фетчит raw `.md` с GitHub Pages этого репо.

### Tools которые сервер экспонирует

| Tool | Inputs | Output |
|---|---|---|
| `list_pages`   | `locale?` (`"en"` / `"ru"`) | Массив `{slug, title, section}` для каждой страницы |
| `read_page`    | `slug`, `locale?` | Полный markdown-body одной страницы |
| `search_pages` | `query`, `locale?` | Страницы где title или body matches, со snippet'ом |
| `get_function` | `library`, `name`, `locale?` | Только секция одной функции (например `memory.Read`, `ui.SetValue`) |

### Установка через navbar

Открой любую страницу этого сайта, кликни кнопку **Actions** справа от breadcrumbs, выбери:
- **Install in VSCode**: откроет VSCode и pre-fill'ит MCP install-диалог.
- **Command for Codex**: скопирует `codex mcp add serotonin-docs -- npx -y mcp-serotonin-docs` в clipboard.

### Установка через терминал

VSCode (с MCP-расширением):

```bash
code --add-mcp '{"name":"serotonin-docs","command":"npx","args":["-y","mcp-serotonin-docs"]}'
```

Codex:

```bash
codex mcp add serotonin-docs -- npx -y mcp-serotonin-docs
```

Cursor / Cline / generic MCP-клиент (`.mcp.json`, `~/.cursor/mcp.json` и т.д.):

```json
{
  "mcpServers": {
    "serotonin-docs": {
      "command": "npx",
      "args": ["-y", "mcp-serotonin-docs"]
    }
  }
}
```

### Типичный flow

1. `search_pages({ query: "PlaySound" })` - найти страницу.
2. `get_function({ library: "audio", name: "PlaySound" })` - прочитать только секцию этой функции.
3. Или `read_page({ slug: "libraries/audio" })` - вся страница.

Русская локаль: передавай `{ locale: "ru" }` любому tool'у.

### Source

Source пакета живёт в [`mcp-server/`](https://github.com/DeftSolutions-dev/serotonin-api-docs/tree/main/mcp-server) subfolder этого репо. Tag вида `mcp-v*` триггерит auto-publish в npm через GitHub Actions.

## Рекомендуемый prompt для агента

```
Ты пишешь скрипты для Serotonin Lua sandbox. Полный и runtime-verified
API reference лежит на:

  https://deftsolutions-dev.github.io/serotonin-api-docs/

Для full context одним fetch'ем:
  https://deftsolutions-dev.github.io/serotonin-api-docs/llms-full.md

Конвенции которые надо соблюдать:
  - LuaJIT 2.0.3 sandbox (реализует Lua 5.1 - _VERSION = "Lua 5.1";
    jit, ffi, os, io, debug, buffer, string.buffer, raknet - все вырезаны).
  - Составные имена функций имеют PascalCase + camelCase + snake_case
    (например ui.NewCheckbox / ui.newCheckbox / ui.new_checkbox).
    Однословные имена также имеют lowercase-форму (memory.Read / memory.read).
    Library `file` lowercase-каноничен (file.read, file.write, ...).
    Multi-letter abbreviations вроде `fromRGB`, `ToHSV`, `SetFFlag` имеют
    только PascalCase + camelCase (snake_case не работает).
    SCREAMING_SNAKE_CASE НИГДЕ не привязано (0 / 177 проверено).
    Aliases это разные Lua callables; никогда не сравнивай через ==.
  - draw.* должны вызываться внутри cheat.Register("paint", fn) (алиас onPaint).
  - Никогда не передавай non-WAV строки в audio.PlaySound, не вызывай
    cheat.LoadString в этом билде (поднимает uncatchable C++ exception),
    не читай _G или недокументированные поля LocalPlayer. Native-crash.
  - mouse.Click / Press / Release принимают Windows VK коды (1=L, 2=R,
    4=M, 5=X1, 6=X2) или "mouse4"/"mouse5", НЕ "left"/"right".
    mouse.SetPosition / GetPosition в этом билде НЕ существуют -
    используй game.SilentAim(x, y).
  - http экспонирует только Get и Post в этом билде. Patch/Put/Delete
    НЕ привязаны.
  - memory.IsValid привязан и проверен. Всегда обвешивай Read/Write через него.
  - ui.SetValue для Dropdown/Listbox берёт 1-based numeric index, НЕ
    option-string. Multiselect берёт {[1]=bool, [2]=bool, ...}.
    Colorpicker берёт {r,g,b,a} integer-table, НЕ Color3 userdata.
  - Таблицы buffer и raknet в текущем билде НЕ привязаны - обе
    возвращают nil на globals. Doc-страницы для них удалены.
  - memory.Read принимает 17 строк типов: byte, short, ushort, int, uint,
    int64, uint64, float, double, bool, string, ptr, pointer, vector2,
    vector3, color3, cframe. Всё остальное (dword, qword, long, longlong,
    int8/16/32, uint8/16/32) поднимает "Invalid memory type for read: '<name>'".
    color3 - multi-return r, g, b (0..255), не одно userdata.
  - Instance:IsA сравнивает ClassName равенство, не наследование -
    ws:IsA("Instance") = FALSE. Сверяй ClassName напрямую для "это part?"
    запросов (Part, MeshPart, WedgePart, TrussPart, CornerWedgePart).
  - cheat.Register события: paint (алиас onPaint, срабатывает per-frame
    даже когда меню закрыто), onUpdate (~10мс cache thread), onSlowUpdate
    (1 секунда), shutdown (при выгрузке), newPlace (при телепорте).

Официальные Serotonin-доки на serotonin-1.gitbook.io stale. Предпочитай
этот reference когда они конфликтуют.
```
