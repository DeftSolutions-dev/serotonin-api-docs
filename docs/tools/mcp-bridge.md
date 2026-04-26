---
sidebar_position: 2
title: MCP Bridge
---

# MCP Bridge for Serotonin

Drive Serotonin from any MCP-capable agent (Codex, Cursor, Cline, VSCode) without writing Lua by hand.

| | |
|---|---|
| **Repository** | [`mcp-serotonin`](https://github.com/DeftSolutions-dev/mcp-serotonin) (drop-in: `bridge.lua` + `server.py`) |
| **Protocol** | MCP over stdio between client and Python; HTTP between Python and the in-cheat Lua bridge |
| **Coverage** | 30 wrapped tool calls covering exploration (instances, players, parts, bones, screen) and the full `utility` / `memory` / `file` / `audio` / `ui` API discovered in this documentation |
| **Crash protection** | Pre-flight blacklist on the Python side, class-based property allowlist on the Lua side, post-mortem `/crash_report` endpoint |

## Architecture

```
┌──────────────┐  stdio   ┌──────────┐  HTTP :8765  ┌────────────┐  cheat   ┌────────┐
│  MCP client  │ <─────>  │ server.py│ <──────────> │ bridge.lua │ <─────>  │ Roblox │
└──────────────┘          └──────────┘              └────────────┘          └────────┘
   (Codex /                 (Python                    (in-cheat               (game
    Cursor /                 coordinator,              long-poll Lua            DataModel,
    Cline /                  pre-flight                that runs ops)           memory,
    custom)                  blacklist)                                         entity, ui)
```

`bridge.lua` runs **inside** Serotonin (Scripting tab → Load) and long-polls the Python coordinator. When a tool call arrives, the Lua side executes it, serializes the result, and posts it back. An asyncio semaphore + one-at-a-time polling means parallel MCP calls cannot stack parallel evals inside Serotonin (parallel `eval` crashes the cheat reliably).

## Why an MCP layer?

Hand-writing Lua to inspect a Roblox game gets old fast, guessing instance names, hoping `entity.GetPlayers` works in the current mode, hex-formatting addresses. With the bridge loaded, an MCP-capable agent can:

- Walk `Workspace`, list live players with positions
- Find the nearest target of any class within a radius
- Read memory, project world coordinates to screen
- Drive the cheat menu (read / write any UI widget value)
- Stream HTTP / WebSocket data
- Probe new APIs interactively without a full reload

The agent reads the **actual game state** and writes Lua that works in **that specific build / mode**, instead of generic templates.

## Tool catalogue

### Instance / world exploration
| Tool | Description |
|---|---|
| `serotonin_ping` | Liveness check |
| `serotonin_eval` | Run arbitrary Lua. Instances / Vector3 / Color3 auto-serialized. Blocked patterns never reach the cheat in safe mode. |
| `serotonin_inspect` | Properties + Attributes + Children for one Instance |
| `serotonin_search_instances` | Walk `:GetDescendants()` with Name substring + optional ClassName filter |
| `serotonin_tree` | Recursive Name/ClassName dump up to N levels |
| `serotonin_find_by_class` | All descendants of a specific ClassName |
| `serotonin_find_player_model` | Find a player Model by Name |
| `serotonin_nearest` | Nearest instance of a class within a radius |
| `serotonin_descendants_stats` | ClassName histogram for a subtree |
| `serotonin_get_scripts` | All `Script` / `LocalScript` / `ModuleScript` paths |

### Entity / parts / players
| Tool | Description |
|---|---|
| `serotonin_list_players` | `entity.GetPlayers()` + cached fields |
| `serotonin_players_full` | Entity fields + live HumanoidRootPart + screen projection |
| `serotonin_list_parts` | `entity.GetParts()` with optional radius filter |
| `serotonin_parts_count` | `entity.GetPartsCount()` |
| `serotonin_part_details` | Full per-part dump for one index, including 8 OBB corners |
| `serotonin_get_bones` | Position / Size / Rotation for named bones of a player |

### Screen / projection
| Tool | Description |
|---|---|
| `serotonin_project_to_screen` | `utility.WorldToScreen(Vector3)` |
| `serotonin_screen_info` | Window size, camera, mouse, delta time, menu state |

### Memory
| Tool | Description |
|---|---|
| `serotonin_memory_read` | `memory.Read(type, addr)` |
| `serotonin_memory_write` | `memory.Write(type, addr, value)` |
| `serotonin_memory_base` | `memory.GetBase()` |
| `serotonin_memory_scan` | `memory.Scan(pattern, [module])` (added) |
| `serotonin_memory_is_valid` | `memory.IsValid(addr)` (added) |

### File sandbox
| Tool | Description |
|---|---|
| `serotonin_file_read` | `file.read(path)` |
| `serotonin_file_write` | `file.write(path, content)` or `file.append` (boolean flag) |
| `serotonin_file_listdir` | `file.listdir(path)` returning `{name, isDirectory, isFile, size?}` records |
| `serotonin_file_op` | One-shot `exists` / `isdir` / `mkdir` (recursive) / `delete` |

### Audio (safe)
| Tool | Description |
|---|---|
| `serotonin_audio_beep` | `audio.Beep(freq, ms)`. Synchronous, blocks for `ms`. |
| `serotonin_audio_stop_all` | `audio.StopAll()` |

`audio.PlaySound` is intentionally **not** wrapped because non-WAV input crashes the cheat with a native SEH exception, see [audio.PlaySound](../libraries/audio#playsound).

### UI (drive the cheat menu)
| Tool | Description |
|---|---|
| `serotonin_ui_get_value` | `ui.GetValue(tab, container, label)` |
| `serotonin_ui_set_value` | `ui.SetValue(tab, container, label, value)` (value type must match the widget kind, see [`ui`](../libraries/ui)) |

## Crash protection

Some Lua expressions in Serotonin trigger **native C++ exceptions** that `pcall` cannot catch, and they kill the cheat DLL. Confirmed crashers in the current build:

- Reading `_G`, `game.DataModel`, `game.PlaceID`, `game.LocalPlayer.Backpack` and a couple dozen other undocumented `LocalPlayer` fields
- Calling `Color3:ToHSV()` on certain instances (see [Crash triggers](../crash-triggers))
- `audio.PlaySound("")`, and **any** non-WAV string passed to `audio.PlaySound` (added in this audit)
- `cheat.LoadString(...)`, every 2-arg invocation we tried in build `version-390ba09e7e944154` raised `"C++ exception"` (added in this audit)
- `game.GetFFlag` / `game.SetFFlag` (legacy flag, conservatively blacklisted)

The bridge ships with three protections layered on top of each other:

1. **Pre-flight blacklist** (`crash_blacklist.json`) on the Python side. Every op is regex-matched before it leaves the coordinator. Blocked ops never reach the cheat.
2. **Class-based property allowlist** in `bridge.lua`. Only documented properties are read via `safe_inspect` / `dive`. Undocumented Roblox fields are a known crash vector, Serotonin's proxy tries to resolve them via raw memory and faults on unknown offsets.
3. **`/crash_report` endpoint**. After a cheat crash, POST the last operation that ran to the endpoint and the bridge auto-extracts a blacklist rule for the shape. Learn once, never repeat.

Updated `crash_blacklist.json` excerpt (this audit's additions are at the end of `eval_code_blocked`):

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

### Requirements
- Windows 10 / 11 + Serotonin
- Python 3.10 +
- `mcp` and `aiohttp` (in `requirements.txt`)

### Install

```bash
git clone https://github.com/DeftSolutions-dev/mcp-serotonin.git
cd mcp-serotonin
pip install -r requirements.txt
```

Drop `bridge.lua` into your Serotonin scripts folder (`C:\Serotonin\scripts\bridge.lua`).

### Wire to your MCP client

The server speaks stdio. Most MCP clients read a JSON config that looks like:

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

Save the file where your client looks for it (`.mcp.json` in the project, user-level config, IDE settings).

### Run

1. Launch Roblox + Serotonin.
2. In the Scripting tab, **Load** `bridge.lua`. You should see:
   ```
   [serotonin-bridge v2] loaded, polling http://127.0.0.1:8765
   [serotonin-bridge v2] ops: ping eval inspect safe_inspect snapshot dive live_dump class_counts list_scripts search
   ```
3. Start your MCP client. It spawns `server.py` on demand.
4. Call `serotonin_ping`. You should get back `"pong"`.

If you get a timeout, check that `bridge.lua` is loaded and that `127.0.0.1:8765` is reachable.

## HTTP control endpoints

On top of the MCP tools, `server.py` exposes a few HTTP routes for direct `curl` access:

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/exec` | Run one op (`{op, args, timeout}`) with pre-flight check |
| `POST` | `/cancel` | Drop every queued command. Use after a crash. |
| `GET` / `POST` | `/safe_mode` | Get or toggle (`{enabled: true/false}`) |
| `GET` | `/blacklist` | Full blacklist dump |
| `POST` | `/blacklist` | Patch (`{add, remove}`) |
| `POST` | `/blacklist/reload` | Re-read `crash_blacklist.json` from disk |
| `POST` | `/crash_report` | Report a crash, auto-extract a rule |
| `GET` | `/health` | Queue depth |

```bash
# Toggle safe mode off (dangerous)
curl -X POST http://127.0.0.1:8765/safe_mode -d '{"enabled": false}'

# Dump current blacklist
curl http://127.0.0.1:8765/blacklist | jq

# Cancel everything queued (after a crash)
curl -X POST http://127.0.0.1:8765/cancel
```

## Tool registration pattern (extending the bridge)

Adding a new tool wrapper is two changes in `server.py`:

```python title="server.py"
# 1. Register the tool surface
TOOLS = [
    # ... existing tools ...
    types.Tool(
        name="serotonin_my_new_tool",
        description="One-line description shown to the agent.",
        inputSchema={
            "type": "object",
            "properties": { "x": {"type": "integer"} },
            "required": ["x"],
        },
    ),
]

# 2. Dispatch by name in _dispatch()
async def _dispatch(name: str, a: dict):
    # ... existing branches ...

    if name == "serotonin_my_new_tool":
        code = f"return some_lua_call({int(a['x'])})"
        return await bridge_call("eval", {"code": code})

    raise RuntimeError(f"unknown tool: {name}")
```

That is the entire pattern. Build your Lua snippet, send it through `bridge_call("eval", ...)`, and the bridge serializes the result back. For known crashers, also add a regex to `crash_blacklist.json` so the agent cannot trip them by accident.

## Things that bite (and how this release handles them)

- **Memory types are exact.** Re-verified live, only these 17 are accepted: `byte`, `short`, `ushort`, `int`, `uint`, `int64`, `uint64`, `float`, `double`, `bool`, `string`, `ptr`, `pointer`, `vector2`, `vector3`, `color3`, `cframe`. Every other variant (`dword`, `qword`, `long`, `longlong`, `int8/16/32`, `uint8/16/32`) raises `"Invalid memory type for read: '<name>'"`. `color3` returns multi-return `r, g, b` (0..255). See [memory.Read](../libraries/memory#read).
- **`game.GetService` uses dot syntax**, not colon. `game.GetService("Players")` works; `game:GetService(...)` errors out because the Lua `game` is a sandbox proxy table, not an Instance userdata.
- **Entity API returns userdata, not indices.** Old docs say `entity.GetPlayers()` returns integers. It returns userdata. Access fields as `p.Name`, call bones as `p:GetBonePosition("HumanoidRootPart")`. See [entity](../libraries/entity).
- **`p.Position` is often stale.** Use `p:GetBonePosition("HumanoidRootPart")` for the live value. `serotonin_players_full` does this for you.
- **`buffer` and `raknet` are not bound** in the current build (`type(buffer) == "nil"`, `type(raknet) == "nil"`). Don't reach for them.
- **`Instance:IsA` compares ClassName equality, not inheritance.** `ws:IsA("Instance")` returns `false`; check `ClassName` directly against a known set of concrete classes when you need a "is this a part" check.
- **Don't parallelize eval.** Two simultaneous evals crash Serotonin. The server enforces serial execution via a semaphore.

## Configuration

Environment variables:
- `SEROTONIN_HTTP_HOST` (default `127.0.0.1`)
- `SEROTONIN_HTTP_PORT` (default `8765`)
- `SEROTONIN_HTTP_ONLY=1`, start only the HTTP coordinator, skip stdio MCP

`bridge.lua` tunables (top of the file, `CFG` table):
- `base_url`, must match the host/port above
- `poll_interval_ms`, minimum gap between polls (default `100`)
- `inflight_ttl_ms`, watchdog reset if `http.Get` callback never fires (default `12000`)
- `max_depth`, default serialization depth (default `3`)

Timeouts are synchronized: poll hold (9s) < server default timeout (10s) < bridge inflight TTL (12s). Don't break this ordering or the watchdog will race the client and you'll get phantom resets.

## License

MIT. The full source for both `bridge.lua` and `server.py` lives in the [`mcp-serotonin`](https://github.com/DeftSolutions-dev/mcp-serotonin) repository.
