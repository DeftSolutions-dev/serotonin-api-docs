---
sidebar_position: 9
title: audio
---

# `audio`

Воспроизведение звука: системный beep, WAV-стриминг, глобальный stop. 3 канонические функции.

| | |
|---|---|
| **Функций** | 3 (8 с алиасами) |
| **Проверено вживую** | 3 из 3 |
| **Требуемый event** | нет |
| **Сайд-эффекты** | `Beep` и `PlaySound` производят слышимый вывод |

> **Алиасы.** `Beep` имеет **две** формы (PascalCase + lowercase). `PlaySound` и `StopAll` имеют по **три** формы. См. [Обзор / Конвенция именования](../overview#конвенция-именования).

## Краткий справочник

| Функция | Сигнатура | Заметка | Статус |
|---|---|---|---|
| [`Beep`](#beep)         | `(freq_hz: number, duration_ms: number)` | системный beep через Windows `Beep`, blocking | <span className="status-badge verified">проверено</span> |
| [`PlaySound`](#playsound) | `(wavData: string, loop: bool, volume: number, pitch: number)` | работает с валидными WAV-байтами, **крашит чит на не-WAV входе** | <span className="status-badge verified">проверено</span> |
| [`StopAll`](#stopall)   | `()`                                  | остановить все играющие звуки, возвращает `nil`, безопасный no-op если ничего не играет | <span className="status-badge verified">проверено</span> |

---

## `Beep`

```lua
audio.Beep(freq_hz: number, duration_ms: number)
```

Воспроизводит один тон через Windows `Beep` syscall. Возвращает `nil`. **Blocking**: скрипт ждёт окончания beep перед продолжением.

Проверено вживую, всё без краша или raise:

| Вызов | Результат |
|---|---|
| `audio.Beep(440, 50)`     | слышимый 440 Hz тон 50 мс |
| `audio.Beep(0, 50)`       | без слышимого тона, `ok=true` |
| `audio.Beep(50000, 50)`   | неслышим (выше hearing range), `ok=true` |
| `audio.Beep(440, 0)`      | `ok=true`, без воспринимаемого тона |
| `audio.Beep(-1, 50)`      | `ok=true`, без воспринимаемого тона |
| `audio.Beep("440", 50)`   | `ok=true`, **string-as-number coerced** |
| `audio.Beep()`            | `"bad argument #1 to '?' (number expected, got no value)"` |
| `audio.Beep(440)`         | `"bad argument #2 to '?' (number expected, got no value)"` |
| `audio.Beep(nil, 50)`     | `"bad argument #1 to '?' (number expected, got nil)"` |

```lua

audio.Beep(880, 30)

audio.Beep(400, 60)
audio.Beep(800, 60)
```

:::warning Beep синхронен
Каждый вызов блокирует поток на `duration_ms`. Не делай длинные beep на `onPaint`, чит будет hitch'ить один кадр на каждый beep.
:::

---

## `PlaySound`

```lua
audio.PlaySound(wavData: string, loop?: bool, volume?: number, pitch?: number)
```

Воспроизводит WAV-байтовую строку асинхронно. Строка это raw байты `.wav` файла (RIFF header + PCM samples). Документированная сигнатура:

| Аргумент | Диапазон | Значение |
|---|---|---|
| `wavData` | string | полный байтовый контент WAV-файла (типичный источник: `file.read("clip.wav")`) |
| `loop`    | bool   | повторять после окончания клипа |
| `volume`  | `0..2` | `1.0` = оригинальный volume, `0` = silent, `>1` = усилен |
| `pitch`   | number | playback rate множитель, `1.0` = оригинал |

Проверено вживую с реальным `hit.wav` (22100 байт, RIFF header), все комбинации играли корректно:

| Вызов | Результат |
|---|---|
| `PlaySound(wav, false, 1.0, 1.0)`     | нормальное воспроизведение |
| `PlaySound(wav, false, 0,   1.0)`     | silent (vol=0) |
| `PlaySound(wav, false, 2.0, 1.0)`     | усиленное (vol=2) |
| `PlaySound(wav, false, 1.0, 0.5)`     | half-speed pitch |
| `PlaySound(wav, false, 1.0, 2.0)`     | double-speed pitch |
| `PlaySound(wav, true,  1.0, 1.0)`     | looping (стоп через `audio.StopAll`) |
| `PlaySound()`                         | `"bad argument #1 (string expected, got no value)"` |
| `PlaySound(nil)`                      | `"bad argument #1 (string expected, got nil)"` |

:::danger Крашит чит на не-WAV входе
Проверено: передача **любой строки которая не является валидным WAV-файлом** в `PlaySound` крашит чит native SEH-исключением которое `pcall` не ловит. Подтверждённые crashers в нашем прогоне:

- `audio.PlaySound("")`: пустая строка
- `audio.PlaySound("not-wav")`: короткая bogus
- `audio.PlaySound("x")`: один байт

Внутренний WAV-loader не валидирует RIFF header перед обработкой. **Всегда передавай реальные WAV-байты** прочитанные через `file.read` или `http.Get`. Никогда не конструируй и не сплайсь WAV-данные inline без полной уверенности в каждом байте.
:::

```lua

local wav = file.read("hit.wav")
if wav then
    audio.PlaySound(wav, false, 1.0, 1.0)
end
```

---

## `StopAll`

```lua
audio.StopAll()
```

Останавливает все играющие звуки. Возвращает `nil`. Проверено вживую: безопасный no-op когда ничего не играет.

```lua
cheat.Register("shutdown", function()
    audio.StopAll()
end)
```

---

## Паттерны

### Hit-confirm beep на aim
```lua
local last_beep = 0

cheat.Register("onUpdate", function()
    local target = entity.GetTarget()
    if target and target.IsAlive then
        local now = utility.GetTickCount()
        if now - last_beep > 100 then
            audio.Beep(1200, 20)
            last_beep = now
        end
    end
end)
```

### Pre-loaded WAV кеш
```lua
local SOUNDS = {}
for _, name in ipairs({"hit", "miss", "alert"}) do
    SOUNDS[name] = file.read(name .. ".wav")
end

local function play(name, vol)
    if SOUNDS[name] then
        audio.PlaySound(SOUNDS[name], false, vol or 1, 1)
    end
end
```

### Stop all при unload
```lua
cheat.Register("shutdown", audio.StopAll)
```
