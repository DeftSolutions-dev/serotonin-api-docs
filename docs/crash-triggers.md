---
sidebar_position: 2
title: Crash triggers
---

# Crash triggers

These trigger native SEH inside the Serotonin DLL, `pcall` does **not** catch them. Touching them takes down the cheat process. Every entry below is verified by a real crash event.

## Hard crashers (never touch)

| Trigger | Notes |
|---|---|
| `_G` (any access, even `type(_G)` in pcall) | Use `getfenv(1)` instead |
| `game.PlaceID` | |
| `game.DataModel` | |
| `game.LocalPlayer.Backpack` | Most undocumented Player props are crashers |
| `game.LocalPlayer.PlayerGui` / `StarterGear` / `PlayerScripts` / `AccountAge` / `FollowUserId` / `DevEnableMouseLock` / `CameraMode` / `CameraMinZoomDistance` / `AutoJumpEnabled` / etc. | Same pattern, undocumented Player fields |
| Parallel `eval` calls | Sandbox is not thread-safe |
| Reading `Workspace.Destructibles` / `Workspace.Debris` (game-specific) | Dangling pointers in destroyed parts |

## Suspected crashers (avoid blind probing)

| Trigger | Why suspected |
|---|---|
| `string.dump()` with no args | Killed the cheat during signature probing |
| `coroutine.yield()` from main thread | Same probe session crashed |
| `table.move()` with no args | Same probe session crashed |

If you need to call any of these, give them valid arguments. Never call random functions blindly with zero args.

## Patterns that are slow but safe

| Pattern | Mitigation |
|---|---|
| `Workspace:GetDescendants()` on big maps | Limit count; use `entity.GetParts()` instead when available |
| Tight `entity.GetPlayers()` loop with bone reads | Throttle to 30-60 Hz, not 200 Hz |
| `memory.Write` in `onUpdate` (200 Hz) | Throttle to 2 Hz to avoid runtime overload |

## Mythbusters, these are NOT crashers

The following were claimed crashers in older docs / community wisdom but are verified safe in build `version-390ba09e7e944154`:

| Was claimed | Reality |
|---|---|
| `Color3:ToHSV()` | Works, returns `h, s, v` multi-return |
| `game.GetFFlag(name, type)` | Works. Type must be `"int"`, `"bool"`, `"float"`, or `"double"` |
| `game.SetFFlag(name, value, type)` | Works |
| `Vector3.Magnitude` / `.Unit` | Both available |
| All `Vector3` arithmetic operators (`+ - * / -unary`) | Work |

## What to do if you hit a new crasher

1. Note the exact line that triggered it.
2. Don't repeat the call, it will crash again.
3. Open an issue at the [project GitHub](https://github.com/DeftSolutions-dev/serotonin-api-docs/issues) with the eval snippet and a stack trace if available.
4. Wait for a Serotonin restart before continuing.
