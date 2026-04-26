---
sidebar_position: 2
title: MCP Bridge
---

# MCP Bridge для Serotonin

Управляй Serotonin из любого MCP-capable агента (Codex, Cursor, Cline, VSCode) без написания Lua вручную.

| | |
|---|---|
| **Репозиторий** | [`mcp-serotonin`](https://github.com/DeftSolutions-dev/mcp-serotonin) (drop-in: `bridge.lua` + `server.py`) |
| **Протокол** | MCP через stdio между client и Python; HTTP между Python и in-cheat Lua-bridge |
| **Покрытие** | 30 wrap'нутых tool-вызовов покрывающих exploration (instances, players, parts, bones, screen) и полный `utility` / `memory` / `file` / `audio` / `ui` API обнаруженный в этой документации |
| **Crash protection** | Pre-flight blacklist на Python-стороне, class-based property allowlist на Lua-стороне, post-mortem `/crash_report` endpoint |

## Архитектура

```
┌──────────────┐  stdio   ┌──────────┐  HTTP :8765  ┌────────────┐  cheat   ┌────────┐
│  MCP client  │ <─────>  │ server.py│ <──────────> │ bridge.lua │ <─────>  │ Roblox │
└──────────────┘          └──────────┘              └────────────┘          └────────┘
   (Codex /                 (Python                    (in-cheat               (game
    Cursor /                 coordinator,              long-poll Lua            DataModel,
    Cline /                  pre-flight                that runs ops)           memory,
    custom)                  blacklist)                                         entity, ui)
```

`bridge.lua` крутится **внутри** Serotonin (Scripting tab → Load) и long-poll'ит Python-coordinator. Когда tool-call приходит, Lua-сторона выполняет его, сериализует результат и постит обратно. Asyncio-семафор + one-at-a-time poll'инг означают что параллельные MCP-вызовы не могут стак'ать параллельные eval'ы внутри Serotonin (parallel `eval` крашит чит надёжно).

## Зачем MCP-слой?

Писать Lua вручную для инспекции Roblox-игры быстро надоедает: гадать имена instances, надеяться что `entity.GetPlayers` работает в текущем mode, hex-форматировать адреса. С загруженным bridge MCP-агент может:

- Walk'ать `Workspace`, листить живых игроков с позициями
- Найти ближайший target любого class в радиусе
- Читать память, проектировать world-координаты в screen
- Управлять cheat-меню (читать / писать любое UI widget value)
- Стримить HTTP / WebSocket данные
- Probe'ить новые API интерактивно без полного reload

Агент читает **актуальное состояние игры** и пишет Lua который работает в **этом конкретном билде / mode**, вместо generic-шаблонов.

## Каталог tools

### Instance / world exploration
| Tool | Описание |
|---|---|
| `serotonin_ping` | Liveness check |
| `serotonin_eval` | Запуск произвольного Lua. Instances / Vector3 / Color3 auto-сериализуются. Blocked patterns не доходят до чита в safe mode. |
| `serotonin_inspect` | Properties + Attributes + Children для одного Instance |
| `serotonin_search_instances` | Walk `:GetDescendants()` с Name substring + опциональный ClassName фильтр |
| `serotonin_tree` | Recursive Name/ClassName dump до N levels |
| `serotonin_find_by_class` | Все потомки конкретного ClassName |
| `serotonin_find_player_model` | Найти player Model по Name |
| `serotonin_nearest` | Nearest instance class в радиусе |
| `serotonin_descendants_stats` | ClassName histogram для subtree |
| `serotonin_get_scripts` | Все `Script` / `LocalScript` / `ModuleScript` пути |

### Entity / parts / players
| Tool | Описание |
|---|---|
| `serotonin_list_players` | `entity.GetPlayers()` + cached fields |
| `serotonin_players_full` | Entity fields + live HumanoidRootPart + screen projection |
| `serotonin_list_parts` | `entity.GetParts()` с опциональным radius filter |
| `serotonin_parts_count` | `entity.GetPartsCount()` |
| `serotonin_part_details` | Полный per-part dump для одного индекса, включая 8 OBB-углов |
| `serotonin_get_bones` | Position / Size / Rotation для именованных bones игрока |

### Screen / projection
| Tool | Описание |
|---|---|
| `serotonin_project_to_screen` | `utility.WorldToScreen(Vector3)` |
| `serotonin_screen_info` | Window size, camera, mouse, delta time, menu state |

### Memory
| Tool | Описание |
|---|---|
| `serotonin_memory_read` | `memory.Read(type, addr)` |
| `serotonin_memory_write` | `memory.Write(type, addr, value)` |
| `serotonin_memory_base` | `memory.GetBase()` |
| `serotonin_memory_scan` | `memory.Scan(pattern, [module])` (added) |
| `serotonin_memory_is_valid` | `memory.IsValid(addr)` (added) |

### File sandbox
| Tool | Описание |
|---|---|
| `serotonin_file_read` | `file.read(path)` |
| `serotonin_file_write` | `file.write(path, content)` или `file.append` (boolean флаг) |
| `serotonin_file_listdir` | `file.listdir(path)` возвращает `{name, isDirectory, isFile, size?}` записи |
| `serotonin_file_op` | One-shot `exists` / `isdir` / `mkdir` (recursive) / `delete` |

### Audio (safe)
| Tool | Описание |
|---|---|
| `serotonin_audio_beep` | `audio.Beep(freq, ms)`. Синхронный, блокирует на `ms`. |
| `serotonin_audio_stop_all` | `audio.StopAll()` |

`audio.PlaySound` намеренно **не** wrap'нут потому что non-WAV input крашит чит native SEH-исключением, см. [audio.PlaySound](../libraries/audio#playsound).

### UI (driving cheat menu)
| Tool | Описание |
|---|---|
| `serotonin_ui_get_value` | `ui.GetValue(tab, container, label)` |
| `serotonin_ui_set_value` | `ui.SetValue(tab, container, label, value)` (тип value должен соответствовать widget'у, см. [`ui`](../libraries/ui)) |

## Crash protection

Некоторые Lua-выражения в Serotonin триггерят **native C++ исключения** которые `pcall` не ловит, и они убивают cheat DLL. Подтверждённые crashers в текущем билде:

- Чтение `_G`, `game.DataModel`, `game.PlaceID`, `game.LocalPlayer.Backpack` и пары десятков других недокументированных `LocalPlayer` полей
- Вызов `Color3:ToHSV()` на некоторых instances (см. [Триггеры крашей](../crash-triggers))
- `audio.PlaySound("")`, и **любая** non-WAV строка переданная в `audio.PlaySound` (added в этом аудите)
- `cheat.LoadString(...)`, каждый 2-arg вызов в билде `version-390ba09e7e944154` raise'ил `"C++ exception"` (added в этом аудите)
- `game.GetFFlag` / `game.SetFFlag` (legacy флаг, консервативно blacklisted)

Bridge поставляется с тремя слоями защиты:

1. **Pre-flight blacklist** (`crash_blacklist.json`) на Python-стороне. Каждая op regex-matched перед уходом из coordinator. Blocked ops не доходят до чита.
2. **Class-based property allowlist** в `bridge.lua`. Только документированные properties читаются через `safe_inspect` / `dive`. Недокументированные Roblox-поля это known crash vector, Serotonin proxy пробует резолвить их через raw memory и фолтит на unknown offsets.
3. **`/crash_report` endpoint**. После cheat-краша POST'ни последнюю операцию которая запустилась в endpoint и bridge auto-извлекает blacklist rule для shape. Learn once, never repeat.

Обновлённый `crash_blacklist.json` (additions этого аудита в конце `eval_code_blocked`):

```json
{
  "version": 2,
  "eval_code_blocked": [
    "game\\s*\\.\\s*DataModel",
    "game\\s*\\.\\s*PlaceID",
    "game\\s*\\.\\s*GetFFlag",
    "game\\s*\\.\\s*SetFFlag",
    "\\b_G\\b",
    "LocalPlayer\\s*\\.\\s*(Backpack|PlayerGui|PlayerScripts|...)",
    ":ToHSV\\s*\\(",
    "audio\\s*\\.\\s*PlaySound\\s*\\(\\s*[\"'][^\"']{0,10}[\"']",
    "audio\\.PlaySound\\s*\\(\\s*nil",
    "cheat\\s*\\.\\s*[Ll]oadString\\s*\\("
  ]
}
```

## Setup

### Требования
- Windows 10 / 11 + Serotonin
- Python 3.10 +
- `mcp` и `aiohttp` (в `requirements.txt`)

### Install

```bash
git clone https://github.com/DeftSolutions-dev/mcp-serotonin.git
cd mcp-serotonin
pip install -r requirements.txt
```

Положи `bridge.lua` в Serotonin scripts folder (`C:\Serotonin\scripts\bridge.lua`).

### Wire'ируй с MCP-клиентом

Server говорит по stdio. Большинство MCP-клиентов читают JSON-config:

```json title=".mcp.json"
{
  "mcpServers": {
    "serotonin-bridge": {
      "command": "python",
      "args": ["C:/path/to/mcp-serotonin/server.py"],
      "env": { "PYTHONUNBUFFERED": "1" }
    }
  }
}
```

Сохрани файл туда где твой клиент его ищет (`.mcp.json` в проекте, user-level config, IDE settings).

### Запуск

1. Запусти Roblox + Serotonin.
2. В Scripting tab нажми **Load** на `bridge.lua`. Должно появиться:
   ```
   [serotonin-bridge v2] loaded, polling http://127.0.0.1:8765
   [serotonin-bridge v2] ops: ping eval inspect safe_inspect snapshot dive live_dump class_counts list_scripts search
   ```
3. Запусти MCP-клиент. Он spawn'ит `server.py` по требованию.
4. Вызови `serotonin_ping`. Должен получить `"pong"`.

Если timeout, проверь что `bridge.lua` загружен и `127.0.0.1:8765` достижим.

## HTTP control endpoints

Поверх MCP-tools `server.py` экспонирует HTTP-маршруты для прямого `curl`:

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/exec` | Запуск одной op (`{op, args, timeout}`) с pre-flight check |
| `POST` | `/cancel` | Drop'нуть всё в очереди. Используй после краша. |
| `GET` / `POST` | `/safe_mode` | Получить или переключить (`{enabled: true/false}`) |
| `GET` | `/blacklist` | Полный blacklist dump |
| `POST` | `/blacklist` | Patch (`{add, remove}`) |
| `POST` | `/blacklist/reload` | Перечитать `crash_blacklist.json` с диска |
| `POST` | `/crash_report` | Зарепортить краш, auto-extract rule |
| `GET` | `/health` | Глубина очереди |

```bash
# Выключить safe mode (опасно)
curl -X POST http://127.0.0.1:8765/safe_mode -d '{"enabled": false}'

# Dump текущий blacklist
curl http://127.0.0.1:8765/blacklist | jq

# Cancel всё в очереди (после краша)
curl -X POST http://127.0.0.1:8765/cancel
```

## Паттерн регистрации tool (расширение bridge)

Добавление нового tool wrapper это два изменения в `server.py`:

```python title="server.py"
# 1. Регистрация tool surface
TOOLS = [
    # ... existing tools ...
    types.Tool(
        name="serotonin_my_new_tool",
        description="Одно-строчное описание для агента.",
        inputSchema={
            "type": "object",
            "properties": { "x": {"type": "integer"} },
            "required": ["x"],
        },
    ),
]

# 2. Dispatch по имени в _dispatch()
async def _dispatch(name: str, a: dict):
    # ... existing branches ...

    if name == "serotonin_my_new_tool":
        code = f"return some_lua_call({int(a['x'])})"
        return await bridge_call("eval", {"code": code})

    raise RuntimeError(f"unknown tool: {name}")
```

Это весь паттерн. Собирай Lua-snippet, шли через `bridge_call("eval", ...)`, и bridge сериализует результат назад. Для known crashers также добавляй regex в `crash_blacklist.json` чтобы агент случайно не споткнулся.

## Что кусается (и как этот релиз handle'ит)

- **Memory types точные.** Перепроверено вживую, принимаются только эти 17: `byte`, `short`, `ushort`, `int`, `uint`, `int64`, `uint64`, `float`, `double`, `bool`, `string`, `ptr`, `pointer`, `vector2`, `vector3`, `color3`, `cframe`. Любой другой вариант (`dword`, `qword`, `long`, `longlong`, `int8/16/32`, `uint8/16/32`) поднимает `"Invalid memory type for read: '<name>'"`. `color3` возвращает multi-return `r, g, b` (0..255). См. [memory.Read](../libraries/memory#read).
- **`game.GetService` использует dot-syntax**, не двоеточие. `game.GetService("Players")` работает; `game:GetService(...)` падает потому что Lua-`game` это sandbox-proxy table, не Instance userdata.
- **Entity API возвращает userdata, не indices.** Старые доки говорят `entity.GetPlayers()` возвращает integers. Возвращает userdata. Field-access как `p.Name`, bones как `p:GetBonePosition("HumanoidRootPart")`. См. [entity](../libraries/entity).
- **`p.Position` часто stale.** Используй `p:GetBonePosition("HumanoidRootPart")` для live-значения. `serotonin_players_full` делает это за тебя.
- **`buffer` и `raknet` не привязаны** в текущем билде (`type(buffer) == "nil"`, `type(raknet) == "nil"`). Не используй их.
- **`Instance:IsA` сравнивает ClassName равенство, не наследование.** `ws:IsA("Instance")` возвращает `false`; сверяй `ClassName` напрямую с известным набором конкретных классов когда нужна проверка "это part?".
- **Не параллельте eval.** Два simultaneous eval'а крашат Serotonin. Server enforces serial execution через семафор.

## Конфигурация

Env vars:
- `SEROTONIN_HTTP_HOST` (default `127.0.0.1`)
- `SEROTONIN_HTTP_PORT` (default `8765`)
- `SEROTONIN_HTTP_ONLY=1`, запустить только HTTP coordinator, skip stdio MCP

`bridge.lua` tunables (топ файла, `CFG` table):
- `base_url`, должен совпадать с host/port выше
- `poll_interval_ms`, минимум gap между polls (default `100`)
- `inflight_ttl_ms`, watchdog reset если `http.Get` callback не срабатывает (default `12000`)
- `max_depth`, default serialization depth (default `3`)

Timeouts синхронизированы: poll hold (9s) < server default timeout (10s) < bridge inflight TTL (12s). Не нарушай ordering или watchdog будет race'ить с клиентом и получишь phantom resets.

## License

MIT. Полный source для `bridge.lua` и `server.py` живёт в [`mcp-serotonin`](https://github.com/DeftSolutions-dev/mcp-serotonin) репозитории.
