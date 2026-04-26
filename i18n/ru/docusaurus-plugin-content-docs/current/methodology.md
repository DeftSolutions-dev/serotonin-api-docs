---
sidebar_position: 100
title: Methodology
---

# Как делалась эта документация

Этот сайт это результат недельного manual re-аудита всего Serotonin Lua API surface для билда `version-390ba09e7e944154`. Каждая страница попадает в публикацию только после того как каждая сигнатура на ней roundtripped против live runtime. Ничего не принимается на веру из старых доков.

Полный процесс ниже это то что реально потребовалось чтобы дойти от "чит экспортит какие-то Lua-таблицы" до "у каждой функции verified-сигнатура с реальными arg-error'ами и shape возврата".

## 1. Перечислить всё что существует

Самый первый шаг был получить честный список того что runtime экспортит. Опубликованные Serotonin-доки заметно дрейфовали с годами (функции переименованы, удалены или добавлены без упоминания), поэтому я начал с нуля.

Я написал маленький Lua-скрипт который:

- Walk'ает каждый binding в `getfenv(0)` и классифицирует его (table / function / userdata / scalar)
- Для каждой таблицы перечисляет ключи через `pairs()` и читает её metatable
- Для известных userdata-самплов (Vector3, Color3, Workspace BasePart, player из `entity.GetLocalPlayer`, buffer) brute-force probе'ит curated-список candidate field-имён. Roblox userdata использует `__index` *функцию*, не таблицу, так что `pairs(ud)` не возвращает ничего полезного и единственный способ surface'ить lazy-fields это запрашивать их по имени.

Output это deterministic JSON snapshot. Re-run после Roblox-апдейта производит чистый diff против предыдущего билда.

Самый первый dump показал например что `entity` экспортит и старый part-method API (`entity.getPartPosition` / `Size` / `Rotation`) и новый (`entity.GetPartsCount` / `GetPartCubeVertices`), с overlap'ом который старый gitbook не признаёт. Знание что обе API существуют было важно для того что тестить дальше.

## 2. Probe'ить каждую функцию одинаково

Для каждой канонической функции я следовал одному и тому же 6-шаговому протоколу. Протокол механический намеренно: я хочу чтобы каждая страница задавала те же вопросы в том же порядке так чтобы ответы были comparable across libraries.

1. **Существование:** `type(lib.Function) == "function"`. Если имя в dump'е но не callable, это идёт в страницу как partial.

2. **Arg shape через `pcall(fn)`** без аргументов, потом с `nil`, потом с прогрессивно большим arg-count'ом. Runtime возвращает ошибки вида `"bad argument #N to '?' (TYPE expected, got no value)"` которые дают тебе точный required type для каждой arg-позиции. Я фиксирую каждую ошибку verbatim и кладу её в страницу так чтобы reader знал что увидит когда ошибётся.

3. **Valid call** с конкретными inputs, capturing return type, multi-return count через `select("#", ...)`, и value shape (для таблиц: keys + value types).

4. **Edge cases**: out-of-range числа, пустые строки, mismatched-типы, очень большие args, ASLR-shifted адреса. Каждое сюрприз-поведение идёт в `:::warning` блок на странице.

5. **Один runnable example.** Не contrived snippet, реальный фрагмент который появился бы в реальном cheat-коде.

6. **Cross-library example** показывающий как функция используется вместе с остальным API. Это то что делает разницу между reference-страницей и tutorial.

Страница не публикуется пока не сделаны хотя бы шаги 1-3. Side-effect-heavy функции (`MoveMouse`, `TeleportToPlace`, `audio.PlaySound` с bogus-data) намеренно probe'ятся только arg-shape вызовами и документируются как `partial` с разделом real-call объясняющим почему было пропущено.

## 3. Roundtrip всё что имеет side-effect

Read-only функции просты. Тяжёлая работа была подтвердить что каждая side-effecting функция реально делает то что её сигнатура утверждает. Несколько примеров:

- Для `mouse.Click(button)` мне сначала пришлось map'нуть **два отдельных button-registry** в чите: тот что использует `IsClicked` (string-имена вроде `"left"` / `"right"`) и тот что использует `Click` / `Press` / `Release` (Windows VK-коды 1, 2, 4, 5, 6 плюс строки `"mouse4"` / `"mouse5"`). Cheat-error message разный для каждого registry: `"Unknown key or button name"` для unknown-имён, `"Invalid mouse button specified for Click"` для valid-имён которые action не принимает, что и сделало split visible.

- Для `keyboard.Press("Shift")` я подтвердил полный state-cycle через `IsPressed("Shift")` между вызовами: `false` потом `Press` потом `true` потом `Release` потом `false`. Probe-скрипт делает 5 ms hold так чтобы IsPressed read внутри этого окна был observable.

- Для `audio.PlaySound(wav, false, 1.0, 1.0)` я прочитал known-good `hit.wav` с диска через `file.read`, потом прогнал каждую комбинацию `volume` (0 / 1 / 2) и `pitch` (0.5 / 1 / 2) и `loop` (false / true) чтобы подтвердить сигнатуру. Я также намеренно probe'ил `PlaySound("")`, `PlaySound("not-wav")`, `PlaySound("x")` чтобы подтвердить что происходит на bad-input. Все они крашат чит native SEH-исключением которое `pcall` не может поймать, это теперь в [crash blacklist](./crash-triggers).

- Для `ui.SetValue(tab, container, label, value)` я построил реальный "Verify" tab в cheat-меню с одним из каждого widget-типа, потом SetValue затем GetValue roundtripped каждый. Этот probe раскрыл сюрпризы: Dropdown берёт 1-based numeric-index, не option-string. Multiselect берёт `{[1]=bool, [2]=bool, ...}`. Colorpicker берёт `{r,g,b,a}` integer-table, не `Color3`. `Color3` переданный в Colorpicker молча принимается но ничего не делает.

- Для `websocket.Connect` я зарегистрировал три callback-таблицы на трёх отдельных соединениях, одна PascalCase, одна camelCase, одна snake_case, и смотрел какая получит `onError` callback когда test-endpoint откажет. Только camelCase получила. Это подтвердило что чит использует camelCase для callbacks и молча дропает не-matching ключи.

- Для `buffer` и `raknet`: перепроверено вживую в текущем билде, `type(buffer) == "nil"` и `type(raknet) == "nil"`. Они не привязаны на global-уровне. В ранних аудитах документировался vestigial `raknet` с dead-хуками; в текущем билде сама таблица отсутствует. Doc-страницы для них удалены.

Каждый из этих результатов получался из запуска probe-скрипта в игре, capturing JSON-output, и reconciling против того что говорил draft страницы. Когда dump говорил одно а live behaviour другое, **live wins**.

## 4. Reconcile против старого gitbook

Следующий шаг был diff'нуть каждую страницу против `serotonin-1.gitbook.io` чтобы найти где старые доки неправильны, устарели или пропускают. Официальные доки пропустили целую библиотеку more than once, и несколько signatures были неправильны таким образом что crash'или код скопированный verbatim.

Конкретные коррекции которые вышли из этого pass:

- `draw.Image` был задокументирован как `(texId, x, y, w, h, r, g, b, a)` (raw RGBA bytes). Реальная сигнатура `(texId, x, y, w, h, color?: Color3, alpha?: number)`. Argument 6 имеет type-tag `__color3_meta`; passing integer raise'ит сразу. Я подтвердил правильную shape загрузив реальный PNG через `utility.LoadImage`, потом вызвав `draw.Image` со всеми arity вариантами 5 / 6 / 7 / 8.
- `cheat.LoadString` был задокументирован как working `(name, code)` форма. Каждый two-argument invocation в этом билде raise'ит `"C++ exception"`. Стандартный Lua `loadstring` работает чисто в sandbox; я redirect'аю readers к нему.
- `bit`, `websocket` и `file.append/delete/listdir/mkdir/exists/isdir` surfaces молчаливо отсутствуют в gitbook. Они теперь задокументированы end-to-end здесь. (`buffer` и `raknet` не привязаны в текущем билде - документировать нечего.)
- Roblox Instance method-ограничения (`Clone`, `WaitForChild`, `ClearAllChildren`, `GetFullName` все nil) и BasePart property-ограничения (`Anchored`, `CFrame`, `CanQuery`, `Mass` nil) не упомянуты в старых доках. Это вызывает silent-баги в user-скриптах. Они теперь в соответствующих страницах.

Полный список gaps в старых доках которые этот сайт закрывает в конце страницы.

## 5. Audit и перевод

Каждая страница потом прогонялась через fixed lint который проверяет:

- Нет softening-слов (`likely`, `probably`, `may`, `appears to`, `seems to`).
- Нет em-dashes (writing-style предпочтение).
- Каждое утверждение завязано на probe-script-результат.
- Function-count в table-header матчится 1-к-1 против dump'а.
- Все cross-references резолвятся в существующие anchor'ы.

Тот же lint крутится и на EN-странице и на RU-mirror так чтобы они оставались синхронизированы. Изменение в одном всегда триггерит изменение в другом.

Перевод намеренно не литературный. Function-имена, error-строки и код остаются на английском. Прозу переведена. Mixed-language reads (например ``"массив of `{[1]=bool, [2]=bool, [3]=bool}` records"``) сохранены когда prose-конвенция это local-Russian slang для технической идеи, так реально говорят working programmers.

## 6. Wire up MCP bridge для live-использования

Reference наиболее полезен когда LLM-агент может читать его интерактивно против running-чита. Проект [MCP bridge](./tools/mcp-bridge) это отдельный компонент который:

- Крутит `bridge.lua` внутри Serotonin (long-poll Lua-клиент).
- Крутит `server.py` снаружи Serotonin (Python-coordinator со stdio MCP).
- Экспонирует 30 tool-wrappers покрывающих exploration (instances, players, parts, bones, screen) плюс полный `utility` / `memory` / `file` / `audio` / `ui` API обнаруженный в этом аудите.
- Pre-flight blacklist'ит каждый confirmed crasher так чтобы агент управляющий читом с этого сайта не мог случайно его положить.

Обновление MCP-сервера в lockstep с audit'ом это то что сделало возможным использовать этот reference как living-документацию а не статичный snapshot.

## Финальное покрытие

| Surface | Функций | Статус |
|---|---|---|
| 17 cheat-side либ | 130 канонических, 282 alias-формы | каждая функция probe'нута |
| `Vector3` userdata | 12 static funcs + 5 constants + 5 instance fields + arithmetic operators | full |
| `Color3` userdata | 7 static funcs + 3 instance fields + 3 instance methods | full |
| Page count | 18 content страниц × EN + RU = 36 опубликованных | |
| Verification artefacts | dump JSON + 30+ probe Lua-скриптов + per-page error capture | reproducible |

## Gaps в старых Serotonin docs которые этот сайт закрывает

Следующие items задокументированы здесь но отсутствовали или были устаревшими на старом `serotonin-1.gitbook.io`:

- Факт что `buffer` и `raknet` не привязаны в текущем билде (gitbook всё ещё подразумевает что они usable)
- `bit` library (полностью отсутствовала в gitbook)
- `websocket` library (полностью отсутствовала)
- `file.append` / `delete` / `listdir` / `mkdir` / `exists` / `isdir` (только `read` и `write` были задокументированы)
- `utility.GetSystemTime` / `GetTimestamp` / `TeleportToPlace`
- `mouse.Press` / `Release` (и the two-registry button-name finding)
- `memory.Scan` / `IsValid` (и `pointer` vs `int64` truthful comparison по тому же address'у)
- `cheat.LoadString` (existence и current broken state)
- `entity.GetPartsCount` / `GetTarget` / `EditModel`
- `draw.GetScreenSize` / `GetMesh` / `GetPartCorners` (и corrected `Image` signature)
- `ui.NewHotkey` / `GetHotkey` (и surprising value-format requirements для Multiselect / Colorpicker / Hotkey)
- Тот факт что `entity.getPartPosition` / `Size` / `Rotation` существуют наряду с новым `entity.GetPart*` API
- Roblox Instance method-ограничения (`Clone` / `WaitForChild` / `ClearAllChildren` / `GetFullName` nil)
- BasePart property-ограничения (`Anchored` / `CFrame` / `CanQuery` / `Mass` nil)

Любой кто копирует snippet с этого сайта и запускает его внутри Serotonin должен видеть тот же return value что страница документирует. Если нет, страница неправильна и re-probe в порядке.
