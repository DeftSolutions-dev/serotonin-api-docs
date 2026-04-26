---
sidebar_position: 9
title: audio
---

# `audio`

Sound playback: system beep, WAV streaming, global stop. 3 canonical functions.

| | |
|---|---|
| **Functions** | 3 (8 with aliases) |
| **Verified live** | 3 of 3 |
| **Required event context** | none |
| **Side effects** | `Beep` and `PlaySound` produce audible output |

> **Aliases.** `Beep` has **two** forms (PascalCase + lowercase). `PlaySound` and `StopAll` each have **three** forms. See [Overview / Naming convention](../overview#naming-convention).

## Quick reference

| Function | Signature | Notes | Status |
|---|---|---|---|
| [`Beep`](#beep)         | `(freq_hz: number, duration_ms: number)` | system beep through Windows `Beep`, blocking | <span className="status-badge verified">verified</span> |
| [`PlaySound`](#playsound) | `(wavData: string, loop: bool, volume: number, pitch: number)` | works with valid WAV bytes, **crashes the cheat on non-WAV input** | <span className="status-badge verified">verified</span> |
| [`StopAll`](#stopall)   | `()`                                  | stop every currently-playing sound, returns `nil`, safe no-op when nothing plays | <span className="status-badge verified">verified</span> |

---

## `Beep`

```lua
audio.Beep(freq_hz: number, duration_ms: number)
```

Plays a single tone through the Windows `Beep` syscall. Returns `nil`. **Blocking**: the script waits until the beep finishes before continuing.

Verified live, all without crashing or raising:

| Call | Result |
|---|---|
| `audio.Beep(440, 50)`     | audible 440 Hz tone for 50 ms |
| `audio.Beep(0, 50)`       | no audible tone, `ok=true` |
| `audio.Beep(50000, 50)`   | inaudible (above hearing range), `ok=true` |
| `audio.Beep(440, 0)`      | `ok=true`, no perceivable tone |
| `audio.Beep(-1, 50)`      | `ok=true`, no perceivable tone |
| `audio.Beep("440", 50)`   | `ok=true`, **string-as-number coerced** |
| `audio.Beep()`            | `"bad argument #1 to '?' (number expected, got no value)"` |
| `audio.Beep(440)`         | `"bad argument #2 to '?' (number expected, got no value)"` |
| `audio.Beep(nil, 50)`     | `"bad argument #1 to '?' (number expected, got nil)"` |

```lua

audio.Beep(880, 30)

audio.Beep(400, 60)
audio.Beep(800, 60)
```

:::warning Beep is synchronous
Each call blocks the calling thread for `duration_ms`. Avoid long beeps on the `onPaint` event, the cheat will hitch one frame per beep.
:::

---

## `PlaySound`

```lua
audio.PlaySound(wavData: string, loop?: bool, volume?: number, pitch?: number)
```

Plays a WAV-format byte string asynchronously. The string is the raw bytes of a `.wav` file (RIFF header + PCM samples). Documented argument shape:

| Arg | Range | Meaning |
|---|---|---|
| `wavData` | string | full byte content of a WAV file (typical source: `file.read("clip.wav")`) |
| `loop`    | bool   | repeat after the clip finishes |
| `volume`  | `0..2` | `1.0` = original volume, `0` = silent, `>1` = amplified |
| `pitch`   | number | playback rate multiplier, `1.0` = original |

Verified live with a real `hit.wav` (22100 bytes, RIFF header), every combination played correctly:

| Call | Result |
|---|---|
| `PlaySound(wav, false, 1.0, 1.0)`     | normal playback |
| `PlaySound(wav, false, 0,   1.0)`     | silent (vol=0) |
| `PlaySound(wav, false, 2.0, 1.0)`     | amplified (vol=2) |
| `PlaySound(wav, false, 1.0, 0.5)`     | half-speed pitch |
| `PlaySound(wav, false, 1.0, 2.0)`     | double-speed pitch |
| `PlaySound(wav, true,  1.0, 1.0)`     | looping (stop with `audio.StopAll`) |
| `PlaySound()`                         | `"bad argument #1 (string expected, got no value)"` |
| `PlaySound(nil)`                      | `"bad argument #1 (string expected, got nil)"` |

:::danger Crashes the cheat on non-WAV input
Verified: passing **any string that is not a valid WAV file** to `PlaySound` crashes the cheat with a native SEH exception that `pcall` cannot catch. Confirmed crashers in our run:

- `audio.PlaySound("")`: empty string
- `audio.PlaySound("not-wav")`: short bogus
- `audio.PlaySound("x")`: single byte

The internal WAV loader does not validate the RIFF header before walking it. **Always pass real WAV bytes** read from `file.read` or `http.Get`. Never construct or splice WAV data inline unless you trust every byte.
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

Stops every sound currently playing. Returns `nil`. Verified live: safe no-op when no sound is playing.

```lua
cheat.Register("shutdown", function()
    audio.StopAll()
end)
```

---

## Patterns

### Hit-confirm beep on aim
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

### Pre-loaded WAV cache
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

### Stop all on script unload
```lua
cheat.Register("shutdown", audio.StopAll)
```
