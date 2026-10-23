"""Build an episode's soundtrack, timeline and subtitles from its story.json.

Usage: python3 engine/build_audio.py episodes/01-zafran

Writes into <episode>/build/:
  audio.wav      final mix (voices + music + sound effects)
  timeline.json  every scene and beat with start/duration, plus mouth envelopes
  subs.ass       Arabic subtitles, song karaoke, titles and big numbers
"""
import hashlib
import json
import math
import os
import re
import subprocess
import sys
import wave

import numpy as np

SR = 44100
FPS = 25
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS = {
    "kareem": os.path.join(ROOT, ".models/vits-piper-ar_JO-kareem-medium/ar_JO-kareem-medium.onnx"),
    "dii": os.path.join(ROOT, ".models/vits-piper-ar_JO-SA_dii-high/ar_JO-SA_dii-high.onnx"),
}
BPM = 112
BEAT = 60.0 / BPM
BAR = 4 * BEAT
LINE_GAP = 0.28
rng = np.random.default_rng(7)


# ---------- wav helpers ----------

def read_wav(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).copy()


def write_wav(path, x):
    x = np.clip(x, -1, 1)
    stereo = np.stack([x, x], axis=1) if x.ndim == 1 else x
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((stereo * 32767).astype(np.int16).tobytes())


def mix_into(track, clip, start, gain=1.0):
    i = int(round(start * SR))
    if i < 0:
        clip, i = clip[-i:], 0
    end = min(len(track), i + len(clip))
    if end > i:
        track[i:end] += clip[: end - i] * gain


# ---------- voices ----------

def synth_voice(text, voice, cache_dir, tempo=1.0):
    """Arabic TTS with piper, then pitch/tempo shaping with rubberband. Cached by content."""
    key = hashlib.sha1(json.dumps([text, voice, tempo], ensure_ascii=False).encode()).hexdigest()[:16]
    out = os.path.join(cache_dir, key + ".wav")
    if not os.path.exists(out):
        raw = out + ".raw.wav"
        subprocess.run([sys.executable, "-m", "piper", "-m", MODELS[voice["model"]], "-f", raw,
                        "--length-scale", str(1.0 / voice.get("speed", 1.0))],
                       input=text.encode(), capture_output=True, check=True)
        ratio = 2 ** (voice.get("pitch", 0) / 12.0)
        filt = f"rubberband=pitch={ratio:.4f}:tempo={tempo:.4f}:formant=shifted,highpass=f=70"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", raw, "-af", filt, "-ar", str(SR), "-ac", "1", out],
                       check=True)
        os.remove(raw)
    x = read_wav(out)
    # trim silence, normalise loudness
    idx = np.where(np.abs(x) > 0.01)[0]
    if len(idx):
        x = x[max(0, idx[0] - 400): idx[-1] + 2000]
    rms = np.sqrt(np.mean(x ** 2)) + 1e-9
    x = x * (0.11 / rms)
    peak = np.max(np.abs(x))
    if peak > 0.9:
        x *= 0.9 / peak
    return x


def envelope(x, offset_frames=0):
    """Per-video-frame mouth openness 0..1."""
    hop = SR // FPS
    n = int(math.ceil(len(x) / hop))
    e = np.array([np.sqrt(np.mean(x[i * hop:(i + 1) * hop] ** 2)) if len(x[i * hop:(i + 1) * hop]) else 0
                  for i in range(n)])
    ref = np.percentile(e, 90) + 1e-6
    return [round(float(v), 2) for v in np.clip(e / ref, 0, 1)]


# ---------- instruments ----------

NOTE = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def hz(name):
    # "C5", "G4", "A#3"
    n = NOTE[name[0]] + (1 if "#" in name else 0)
    octave = int(name[-1])
    return 440.0 * 2 ** ((n + 12 * (octave + 1) - 69) / 12.0)


def t_axis(dur):
    return np.arange(int(dur * SR)) / SR


def marimba(f, dur=0.6, vel=1.0):
    t = t_axis(dur)
    a = np.minimum(1, t / 0.004)
    x = np.sin(2 * np.pi * f * t) * np.exp(-t * 7) + 0.35 * np.sin(2 * np.pi * 3.98 * f * t) * np.exp(-t * 28)
    return x * a * vel * 0.5


def bell(f, dur=1.2, vel=1.0):
    t = t_axis(dur)
    x = (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * 2.76 * f * t) * np.exp(-t * 3)) * np.exp(-t * 3.5)
    return x * np.minimum(1, t / 0.002) * vel * 0.3


def bass(f, dur=0.45, vel=1.0):
    t = t_axis(dur)
    x = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t)
    return x * np.exp(-t * 4) * np.minimum(1, t / 0.01) * vel * 0.45


def kick():
    t = t_axis(0.25)
    f = 50 + 70 * np.exp(-t * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 14) * 0.6


def clap():
    t = t_axis(0.18)
    n = rng.standard_normal(len(t))
    n = np.diff(n, prepend=0)  # brighten
    env = np.exp(-t * 35) + 0.6 * np.exp(-np.maximum(0, t - 0.012) * 40) * (t > 0.012)
    return n * env * 0.18


def shaker():
    t = t_axis(0.07)
    n = np.diff(rng.standard_normal(len(t)), prepend=0)
    return n * np.exp(-t * 60) * 0.05


# ---------- sound effects ----------

def sfx(name):
    if name == "pop":
        t = t_axis(0.16)
        f = 300 + 900 * t / 0.16
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 20) * 0.5
    if name == "sparkle":
        out = np.zeros(int(1.2 * SR))
        for i, n in enumerate(["C6", "E6", "G6", "C7", "E7"]):
            mix_into(out, bell(hz(n), 0.9, 0.8), i * 0.07)
        return out
    if name == "boing":
        t = t_axis(0.5)
        f = 180 + 220 * t / 0.5 + 30 * np.sin(2 * np.pi * 14 * t)
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 5) * 0.4
    if name == "flap":
        out = np.zeros(int(1.0 * SR))
        for i in range(4):
            t = t_axis(0.12)
            n = rng.standard_normal(len(t))
            n = np.convolve(n, np.ones(12) / 12, "same")
            mix_into(out, n * np.sin(np.pi * t / 0.12) * 0.6, i * 0.2)
        return out
    if name == "wind":
        t = t_axis(3.0)
        n = np.convolve(rng.standard_normal(len(t)), np.ones(60) / 60, "same")
        return n * np.sin(np.pi * t / 3.0) ** 2 * 0.8
    if name == "sting":
        out = np.zeros(int(2.6 * SR))
        for i, n in enumerate(["C5", "E5", "G5", "C6"]):
            mix_into(out, marimba(hz(n), 1.2), i * 0.11)
        mix_into(out, bell(hz("C7"), 2.0, 0.7), 0.44)
        mix_into(out, bell(hz("G6"), 2.0, 0.5), 0.5)
        return out
    raise ValueError(name)


# ---------- music ----------

CHORDS = {"C": ["C3", "E4", "G4", "C5"], "F": ["F2", "A4", "C5", "F5"], "G": ["G2", "B4", "D5", "G5"],
          "Am": ["A2", "C5", "E5", "A5"]}

# The hook: one bar of eighth-notes per lyric line ('-' = hold). Same tune every time — repetition is the point.
HOOK = [
    "E5 G5 G5 - A5 G5 E5 -",
    "D5 E5 G5 E5 D5 C5 D5 -",
    "E5 G5 A5 G5 E5 D5 C5 -",
    "D5 E5 G5 A5 G5 E5 C5 -",
]
HOOK_CHORDS = ["C", "G", "F", "C"]
PASSES = 2


def drums_bar(out, start, full=True):
    for b in range(4):
        t = start + b * BEAT
        if full and b in (0, 2):
            mix_into(out, kick(), t)
        if b in (1, 3):
            mix_into(out, clap(), t)
        for s in range(2):
            mix_into(out, shaker(), t + s * BEAT / 2)


def chord_bar(out, start, chord, vel=1.0):
    notes = CHORDS[chord]
    mix_into(out, bass(hz(notes[0]), BEAT * 1.8, vel), start)
    mix_into(out, bass(hz(notes[0]), BEAT * 1.8, vel * 0.8), start + 2 * BEAT)
    for b in range(4):
        for n in notes[1:]:
            mix_into(out, marimba(hz(n), 0.4, 0.22 * vel), start + b * BEAT + BEAT / 2)


def bed(dur):
    """Soft background loop under dialogue: gentle marimba arpeggios, no drums."""
    out = np.zeros(int((dur + 2) * SR))
    prog = ["C", "Am", "F", "G"]
    bar = 0
    while bar * BAR < dur:
        notes = CHORDS[prog[bar % 4]]
        pattern = [notes[1], notes[2], notes[3], notes[2]]
        for b in range(4):
            mix_into(out, marimba(hz(pattern[b]), 0.5, 0.5), bar * BAR + b * BEAT)
        mix_into(out, bass(hz(notes[0]), BAR * 0.9, 0.5), bar * BAR)
        bar += 1
    t = t_axis(dur)
    fade = np.minimum(1, np.minimum(t / 0.5, (dur - t) / 0.5))
    return out[: len(t)] * fade


def song(lines, cache_dir, voices):
    """Intro bar, the verse sung twice (one bar per line), outro bar. A kids' chorus chants each line on the beat."""
    bars = 2 + PASSES * len(lines)
    total = bars * BAR
    music = np.zeros(int((total + 2) * SR))
    vox = np.zeros_like(music)
    timings = []
    drums_bar(music, 0, full=False)
    chord_bar(music, 0, "C", 0.8)
    target = 0.9 * BAR
    for p in range(PASSES):
        for i, line in enumerate(lines):
            start = BAR * (1 + p * len(lines) + i)
            drums_bar(music, start)
            chord_bar(music, start, HOOK_CHORDS[i % len(HOOK_CHORDS)])
            for k, n in enumerate(HOOK[i % len(HOOK)].split()):
                if n != "-":
                    mix_into(music, marimba(hz(n), 0.5, 0.75), start + k * BEAT / 2)
                    mix_into(music, bell(hz(n) * 2, 0.6, 0.18), start + k * BEAT / 2)
            # a boy and a girl voice together, nudged to fit the bar without sounding slowed down
            for spk, delay in (("H", 0.0), ("M", 0.015)):
                base = synth_voice(line, voices[spk], cache_dir)
                tempo = max(0.8, min(1.35, (len(base) / SR) / target))
                mix_into(vox, synth_voice(line, voices[spk], cache_dir, tempo=tempo), start + delay, 0.75)
            timings.append({"start": start, "dur": target, "text": line})
    end = BAR * (1 + PASSES * len(lines))
    drums_bar(music, end)
    chord_bar(music, end, "C")
    mix_into(music, bell(hz("C6"), 2.0, 0.8), end + BAR * 0.5)
    n = int(total * SR)
    return music[:n], vox[:n], timings


# ---------- subtitles ----------

DIACRITICS = re.compile("[ً-ِْٰ]")


def plain(text):
    return DIACRITICS.sub("", text)


def ass_time(t):
    t = max(0, t)
    h = int(t // 3600)
    m = int(t % 3600 // 60)
    s = t % 60
    return f"{h}:{m:02d}:{s:05.2f}"


ASS_HEAD = """[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Sub,Noto Sans Arabic,66,&H00FFFFFF,&H00FFFFFF,&H00301A08,&H64000000,1,0,0,0,100,100,0,0,1,6,2,2,80,80,46,1
Style: Song,Noto Kufi Arabic,74,&H0000E6FF,&H00FFFFFF,&H006B2A8C,&H64000000,1,0,0,0,100,100,0,0,1,7,3,2,80,80,50,1
Style: Title,Noto Kufi Arabic,132,&H0030E8FF,&H00FFFFFF,&H00104AC8,&H96000000,1,0,0,0,100,100,0,0,1,12,6,5,60,60,0,1
Style: Big,Noto Kufi Arabic,300,&H0000D7FF,&H00FFFFFF,&H00B84A12,&H96000000,1,0,0,0,100,100,0,0,1,14,6,8,0,0,40,1
Style: Speaker,Noto Kufi Arabic,40,&H00FFFFFF,&H00FFFFFF,&H00B85A1F,&H00000000,1,0,0,0,100,100,0,0,1,5,0,2,80,80,150,1
"""


def karaoke(text, dur):
    words = plain(text).split()
    weights = [max(2, len(w)) for w in words]
    total = sum(weights)
    return " ".join(f"{{\\k{int(round(dur * 100 * wt / total))}}}{w}" for w, wt in zip(words, weights))


# ---------- main ----------

def main(ep_dir):
    story = json.load(open(os.path.join(ep_dir, "story.json")))
    build = os.path.join(ep_dir, "build")
    cache = os.path.join(build, "voices")
    os.makedirs(cache, exist_ok=True)
    voices = story["voices"]

    t = 0.0
    events, scenes, ass = [], [], []
    vox_clips, music_clips, sfx_clips = [], [], []
    for sc in story["scenes"]:
        s_start = t
        beats = []
        for b in sc["beats"]:
            ev = dict(b)
            ev["start"] = t
            if "say" in b:
                clip = synth_voice(b["tts"], voices[b["say"]], cache)
                d = len(clip) / SR
                vox_clips.append((clip, t))
                ev["env"] = envelope(clip)
                ev["dur"] = max(d + LINE_GAP, b.get("dur", 0))
                ass.append(f"Dialogue: 1,{ass_time(t)},{ass_time(t + d + 0.15)},Speaker,,0,0,0,,{voices[b['say']]['name']}")
                ass.append(f"Dialogue: 0,{ass_time(t)},{ass_time(t + d + 0.15)},Sub,,0,0,0,,{plain(b['tts'])}")
            elif "song" in b:
                sg = story["songs"][b["song"]]
                music, vox, timings = song(sg["lines"], cache, voices)
                music_clips.append((music, t, 0.55))
                vox_clips.append((vox, t))
                ev["dur"] = len(music) / SR
                ev["env"] = envelope(vox)
                ev["lines"] = [{"start": t + x["start"], "dur": x["dur"]} for x in timings]
                for x in timings:
                    st = t + x["start"]
                    ass.append(f"Dialogue: 0,{ass_time(st - 0.05)},{ass_time(st + BAR - 0.05)},Song,,0,0,0,,"
                               + karaoke(x["text"], x["dur"]))
            elif "title" in b:
                ev["dur"] = b["dur"]
                sfx_clips.append((sfx("sting"), t, 0.9))
                ass.append(f"Dialogue: 2,{ass_time(t)},{ass_time(t + b['dur'])},Title,,0,0,0,,"
                           "{\\fscx20\\fscy20\\t(0,350,\\fscx112\\fscy112)\\t(350,520,\\fscx100\\fscy100)\\fad(0,300)}"
                           + b["title"])
            else:
                ev["dur"] = b.get("dur", b.get("pause", 0))
            if "sfx" in b:
                sfx_clips.append((sfx(b["sfx"]), t, 0.7))
            if b.get("reveal"):
                sfx_clips.append((sfx("pop"), t, 0.8))
            if b.get("hearts"):
                sfx_clips.append((sfx("sparkle"), t, 0.6))
            if "big" in b:
                ass.append(f"Dialogue: 3,{ass_time(t)},{ass_time(t + ev['dur'] + 0.4)},Big,,0,0,0,,"
                           "{\\fscx10\\fscy10\\t(0,250,\\fscx120\\fscy120)\\t(250,400,\\fscx100\\fscy100)\\fad(0,250)}"
                           + b["big"])
            if "ask" in b:
                ass.append(f"Dialogue: 3,{ass_time(t + 1.0)},{ass_time(t + ev['dur'] + 2.8)},Big,,0,0,0,,"
                           "{\\t(0,400,\\frz-12)\\t(400,800,\\frz12)\\t(800,1200,\\frz-12)\\t(1200,1600,\\frz12)\\t(1600,2000,\\frz0)}"
                           + b["ask"])
            beats.append(ev)
            t += ev["dur"]
        scenes.append({"id": sc["id"], "start": s_start, "dur": t - s_start, "beats": beats})

    total = t + 0.5
    n = int(total * SR)
    voice_track = np.zeros(n)
    for clip, st in vox_clips:
        mix_into(voice_track, clip, st)
    music_track = np.zeros(n)
    for clip, st, g in music_clips:
        mix_into(music_track, clip, st, g)
    # soft bed under every non-song stretch
    for sc in scenes:
        if not any("song" in b for b in sc["beats"]):
            mix_into(music_track, bed(sc["dur"]), sc["start"], 0.16)
    fx_track = np.zeros(n)
    for clip, st, g in sfx_clips:
        mix_into(fx_track, clip, st, g)
    mix = voice_track * 1.0 + music_track + fx_track * 0.8
    mix = np.tanh(mix * 1.4) / 1.4  # gentle limiter
    write_wav(os.path.join(build, "audio.wav"), mix)

    json.dump({"fps": FPS, "duration": total, "scenes": scenes}, open(os.path.join(build, "timeline.json"), "w"),
              ensure_ascii=False)
    with open(os.path.join(build, "subs.ass"), "w") as f:
        f.write(ASS_HEAD + "\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n")
        f.write("\n".join(ass) + "\n")
    print(f"audio {total:.1f}s, {len(scenes)} scenes, {sum(len(s['beats']) for s in scenes)} beats")


if __name__ == "__main__":
    main(sys.argv[1])
