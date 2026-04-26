---
sidebar_position: 2
title: Триггеры крашей
---

# Триггеры крашей

Эти штуки триггерят native SEH внутри Serotonin DLL, `pcall` их **не** ловит. Касание роняет процесс чита. Каждая запись подтверждена реальным крашем.

## Жёсткие крашеры (не трогать никогда)

| Триггер | Заметки |
|---|---|
| `_G` (любой доступ, даже `type(_G)` в pcall) | Используй `getfenv(1)` |
| `game.PlaceID` | |
| `game.DataModel` | |
| `game.LocalPlayer.Backpack` | Большинство недокументированных Player-полей, крашеры |
| `game.LocalPlayer.PlayerGui` / `StarterGear` / `PlayerScripts` / `AccountAge` / `FollowUserId` / `DevEnableMouseLock` / `CameraMode` / `CameraMinZoomDistance` / `AutoJumpEnabled` / и т.п. | Тот же паттерн, недокументированные Player-поля |
| Параллельные `eval`-вызовы | Песочница не thread-safe |
| Чтение `Workspace.Destructibles` / `Workspace.Debris` (game-specific) | Dangling pointers в уничтоженных частях |

## Подозрительные крашеры (избегай слепого пробинга)

| Триггер | Почему подозрительный |
|---|---|
| `string.dump()` без аргументов | Убил чит во время signature-пробинга |
| `coroutine.yield()` из main thread | Та же проб-сессия крашнула |
| `table.move()` без аргументов | Та же проб-сессия крашнула |

Если нужно вызвать что-то из этого, давай валидные аргументы. Никогда не вызывай функции вслепую с zero args.

## Паттерны, медленные, но безопасные

| Паттерн | Митигация |
|---|---|
| `Workspace:GetDescendants()` на больших картах | Ограничивай по count; используй `entity.GetParts()` если доступно |
| Tight `entity.GetPlayers()` цикл с bone-чтениями | Троттли до 30-60 Гц, не 200 Гц |
| `memory.Write` в `onUpdate` (200 Гц) | Троттли до 2 Гц во избежание перегруза рантайма |

## Развенчанные мифы, это НЕ крашеры

Следующее раньше считалось крашерами в старых доках / community wisdom, но проверено безопасно в билде `version-390ba09e7e944154`:

| Считалось | Реальность |
|---|---|
| `Color3:ToHSV()` | Работает, возвращает `h, s, v` multi-return |
| `game.GetFFlag(name, type)` | Работает. Type должен быть `"int"`, `"bool"`, `"float"` или `"double"` |
| `game.SetFFlag(name, value, type)` | Работает |
| `Vector3.Magnitude` / `.Unit` | Оба доступны |
| Все арифметические операторы `Vector3` (`+ - * / -unary`) | Работают |

## Что делать если поймал новый крашер

1. Запиши точную строку которая триггернула.
2. Не повторяй вызов, крашнет снова.
3. Открой issue на [GitHub проекта](https://github.com/DeftSolutions-dev/serotonin-api-docs/issues) с eval-сниппетом и stack trace если есть.
4. Перезапусти Serotonin перед продолжением.
