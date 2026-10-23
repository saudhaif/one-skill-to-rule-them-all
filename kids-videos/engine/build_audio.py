"""Build an episode's soundtrack, timeline and subtitles from its story.json.

Usage: python3 engine/build_audio.py episodes/01-zafran [--voices piper|google|elevenlabs]

Any <episode>/recordings/<line id>.wav (ids listed in build/recording-sheet.md) replaces that synthetic line,
so human voice actors can be dropped in line by line.

Writes into <episode>/build/:
  audio.wav      final mix (voices + music + sound effects)
  timeline.json  every scene and beat with start/duration, plus mouth envelopes
  subs.ass       Arabic subtitles, song karaoke, titles and big numbers
  recording-sheet.md, guide-<song>.wav   everything a voice actor needs
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

import khaleeji as kh

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

PROVIDER = "piper"     # piper | google | elevenlabs — set with --voices
RECORDED_DIR = None    # <episode>/recordings: a <line id>.wav there replaces the synthetic line


def _post_json(url, body, headers):
    import ssl
    import urllib.error
    import urllib.request
    ca = os.environ.get("SSL_CERT_FILE") or os.environ.get("REQUESTS_CA_BUNDLE")
    req = urllib.request.Request(url, json.dumps(body).encode(), {"Content-Type": "application/json", **headers})
    try:
        with urllib.request.urlopen(req, context=ssl.create_default_context(cafile=ca), timeout=120) as r:
            return r.read()
    except urllib.error.HTTPError as e:
        sys.exit(f"{url.split('?')[0]} -> HTTP {e.code}: {e.read()[:400].decode(errors='replace')}")


def tts_piper(text, voice, raw):
    subprocess.run([sys.executable, "-m", "piper", "-m", MODELS[voice["model"]], "-f", raw,
                    "--length-scale", str(1.0 / voice.get("speed", 1.0))],
                   input=text.encode(), capture_output=True, check=True)


def tts_google(text, voice, raw):
    """Google Cloud Text-to-Speech (Chirp 3 HD Arabic voices). Needs GOOGLE_TTS_API_KEY."""
    import base64
    key = os.environ.get("GOOGLE_TTS_API_KEY") or sys.exit("GOOGLE_TTS_API_KEY is not set")
    g = voice["google"]
    body = {"input": {"text": text},
            "voice": {"languageCode": g.get("language", "ar-XA"), "name": g["name"]},
            "audioConfig": {"audioEncoding": "LINEAR16", "sampleRateHertz": SR, "speakingRate": g.get("rate", 1.0)}}
    data = json.loads(_post_json(f"https://texttospeech.googleapis.com/v1/text:synthesize?key={key}", body, {}))
    with open(raw, "wb") as f:
        f.write(base64.b64decode(data["audioContent"]))


def tts_elevenlabs(text, voice, raw):
    """ElevenLabs multilingual voices. Needs ELEVENLABS_API_KEY and a voice_id per character."""
    key = os.environ.get("ELEVENLABS_API_KEY") or sys.exit("ELEVENLABS_API_KEY is not set")
    e = voice["elevenlabs"]
    body = {"text": text, "model_id": e.get("model", "eleven_multilingual_v2"),
            "voice_settings": {"stability": e.get("stability", 0.4), "similarity_boost": 0.8,
                               "style": e.get("style", 0.45), "use_speaker_boost": True}}
    audio = _post_json(f"https://api.elevenlabs.io/v1/text-to-speech/{e['voice_id']}?output_format=mp3_44100_128",
                       body, {"xi-api-key": key, "Accept": "audio/mpeg"})
    with open(raw + ".mp3", "wb") as f:
        f.write(audio)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", raw + ".mp3", raw], check=True)
    os.remove(raw + ".mp3")


def synth_voice(text, voice, cache_dir, tempo=1.0, line_id=None):
    """One spoken line: a human recording if present, else TTS from the chosen provider. Cached by content."""
    recorded = line_id and RECORDED_DIR and os.path.join(RECORDED_DIR, line_id + ".wav")
    if recorded and os.path.exists(recorded):
        src_wav, pitch = recorded, 0.0
    else:
        # synthetic piper voices get pitch-shifted into children's voices; the realistic providers are left natural
        settings = voice.get(PROVIDER, {}) if PROVIDER != "piper" else voice
        pitch = settings.get("pitch", 0.0)
        src_wav = None
    key = hashlib.sha1(json.dumps([text, voice, tempo, PROVIDER, recorded and os.path.getmtime(recorded)
                                   if recorded and os.path.exists(recorded) else None],
                                  ensure_ascii=False).encode()).hexdigest()[:16]
    out = os.path.join(cache_dir, key + ".wav")
    if not os.path.exists(out):
        raw = out + ".raw.wav"
        if src_wav is None:
            {"piper": tts_piper, "google": tts_google, "elevenlabs": tts_elevenlabs}[PROVIDER](text, voice, raw)
            src_wav = raw
        ratio = 2 ** (pitch / 12.0)
        filt = f"rubberband=pitch={ratio:.4f}:tempo={tempo:.4f}:formant=shifted,highpass=f=70"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src_wav, "-af", filt, "-ar", str(SR), "-ac", "1", out],
                       check=True)
        if src_wav == raw:
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


def bell(f, dur=1.2, vel=1.0):
    t = t_axis(dur)
    x = (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * 2.76 * f * t) * np.exp(-t * 3)) * np.exp(-t * 3.5)
    return x * np.minimum(1, t / 0.002) * vel * 0.3


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
        # oud flourish up the Bayati scale, landed by the جحلة and a row of claps
        out = np.zeros(int(2.8 * SR))
        for i, n in enumerate(["D3", "F3", "G3", "A3", "D4"]):
            mix_into(out, kh.oud(kh.hz(n), 1.4, 1.0), i * 0.09)
        mix_into(out, kh.jahla(1.0), 0.45)
        mix_into(out, kh.clap_row(1.0), 0.45)
        mix_into(out, kh.oud(kh.hz("D2"), 2.0, 1.2), 0.45)
        return out * 1.3
    if name in ("nahma", "nahma_long"):
        # the نهّام's «يا مال»; a real recording in recordings/ replaces the synthesis
        rec = RECORDED_DIR and os.path.join(RECORDED_DIR, f"{name}.wav")
        if rec and os.path.exists(rec):
            return read_wav(rec)
        return kh.sea_call(short=(name == "nahma"))
    raise ValueError(name)


# ---------- music ----------

# The hook: one bar of eighth-notes per lyric line ('-' = hold), in maqam Bayati on D (Eh = E half-flat).
# Same tune every time — repetition is the point.
HOOK = [
    "A3 A3 G3 - F3 G3 A3 -",
    "Bb3 A3 G3 F3 Eh3 F3 D3 -",
    "D3 F3 G3 A3 Bb3 A3 G3 -",
    "A3 G3 F3 Eh3 F3 Eh3 D3 -",
]
PASSES = 2


def groove_bar(out, start, full=True):
    """Khaleeji sea groove: جحلة on the downbeats, مرواس filling, rows of claps on the off-beats."""
    for beat in (0, 1.5) if full else (0,):
        mix_into(out, kh.jahla(1.0 if beat == 0 else 0.7), start + beat * BEAT)
    for beat in (0.5, 2.5, 3.0, 3.5):
        mix_into(out, kh.mirwas(0.8), start + beat * BEAT)
    for beat in ((1.0, 2.5, 3.0) if full else (1.0, 3.0)):
        mix_into(out, kh.clap_row(1.0), start + beat * BEAT)
    # low oud pedal on the tonic
    mix_into(out, kh.oud(kh.hz("D2"), BEAT * 2, 0.9), start)
    mix_into(out, kh.oud(kh.hz("A2"), BEAT * 2, 0.6), start + 2 * BEAT)


_HUM = None


def hum_loop(dur):
    """Sailors' humming drone, synthesised once and looped with crossfades."""
    global _HUM
    if _HUM is None:
        _HUM = kh.hum(8.0, gain=0.35)
    out = np.zeros(int((dur + 8) * SR))
    step = 6.5
    k = 0
    while k * step < dur:
        mix_into(out, _HUM, k * step)
        k += 1
    t = t_axis(dur)
    return out[: len(t)] * np.minimum(1, np.minimum(t / 1.0, (dur - t) / 1.0))


def bed(dur):
    """Soft background under dialogue: the sailors' hum with a slow oud phrase in Bayati."""
    out = hum_loop(dur) * 0.6
    phrase = ["D3", "A3", "F3", "G3", "A3", "G3", "F3", "Eh3"]
    k = 0
    while k * 2 * BEAT < dur - 1:
        mix_into(out, kh.oud(kh.hz(phrase[k % len(phrase)]), 1.6, 0.7), k * 2 * BEAT)
        k += 1
    t = t_axis(dur)
    fade = np.minimum(1, np.minimum(t / 0.5, (dur - t) / 0.5))
    return out[: len(t)] * fade


def song(name, lines, cache_dir, voices):
    """Intro bar, the verse sung twice (one bar per line), outro bar. A kids' chorus chants each line on the beat."""
    bars = 2 + PASSES * len(lines)
    total = bars * BAR
    music = np.zeros(int((total + 2) * SR))
    vox = np.zeros_like(music)
    timings = []
    groove_bar(music, 0, full=False)
    target = 0.9 * BAR
    for p in range(PASSES):
        for i, line in enumerate(lines):
            start = BAR * (1 + p * len(lines) + i)
            groove_bar(music, start)
            for k, n in enumerate(HOOK[i % len(HOOK)].split()):
                if n != "-":
                    mix_into(music, kh.oud(kh.hz(n), 0.7, 1.1), start + k * BEAT / 2)
                    mix_into(music, kh.oud(kh.hz(n[:-1] + str(int(n[-1]) + 1)), 0.5, 0.35), start + k * BEAT / 2)
            # a boy and a girl voice together, nudged to fit the bar without sounding slowed down
            for spk, delay in (("H", 0.0), ("M", 0.015)):
                lid = f"song-{name}-{i + 1}-{spk}"
                base = synth_voice(line, voices[spk], cache_dir, line_id=lid)
                tempo = max(0.8, min(1.35, (len(base) / SR) / target))
                mix_into(vox, synth_voice(line, voices[spk], cache_dir, tempo=tempo, line_id=lid), start + delay, 0.75)
            timings.append({"start": start, "dur": target, "text": line})
    end = BAR * (1 + PASSES * len(lines))
    groove_bar(music, end)
    mix_into(music, kh.jahla(1.2), end + BAR)
    mix_into(music, kh.clap_row(1.2), end + BAR)
    mix_into(music, kh.oud(kh.hz("D3"), 2.0, 1.2), end + BAR)
    n = int(total * SR)
    mix_into(music, hum_loop(total) * 0.35, 0.0)
    # a real sung take (recorded over build/guide-<song>.wav) replaces the chanted chorus
    sung = RECORDED_DIR and os.path.join(RECORDED_DIR, f"song-{name}.wav")
    if sung and os.path.exists(sung):
        vox = np.zeros_like(music)
        mix_into(vox, read_wav(sung), 0.0)
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
; Encoding -1 lets libass pick right-to-left for Arabic, so punctuation lands at the line end

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Sub,Noto Sans Arabic,66,&H00FFFFFF,&H00FFFFFF,&H00301A08,&H64000000,1,0,0,0,100,100,0,0,1,6,2,2,80,80,46,-1
Style: Song,Noto Kufi Arabic,74,&H0000E6FF,&H00FFFFFF,&H006B2A8C,&H64000000,1,0,0,0,100,100,0,0,1,7,3,2,80,80,50,-1
Style: Title,Noto Kufi Arabic,132,&H0030E8FF,&H00FFFFFF,&H00104AC8,&H96000000,1,0,0,0,100,100,0,0,1,12,6,5,60,60,0,-1
Style: Big,Noto Kufi Arabic,300,&H0000D7FF,&H00FFFFFF,&H00B84A12,&H96000000,1,0,0,0,100,100,0,0,1,14,6,8,0,0,40,-1
"""


def karaoke(text, dur):
    words = plain(text).split()
    weights = [max(2, len(w)) for w in words]
    total = sum(weights)
    return " ".join(f"{{\\k{int(round(dur * 100 * wt / total))}}}{w}" for w, wt in zip(words, weights))


# ---------- main ----------

def main(ep_dir):
    global RECORDED_DIR
    RECORDED_DIR = os.path.join(ep_dir, "recordings")
    story = json.load(open(os.path.join(ep_dir, "story.json")))
    build = os.path.join(ep_dir, "build")
    cache = os.path.join(build, "voices")
    os.makedirs(cache, exist_ok=True)
    voices = story["voices"]

    t = 0.0
    events, scenes, ass = [], [], []
    vox_clips, music_clips, sfx_clips = [], [], []
    sheet = []
    for sc in story["scenes"]:
        s_start = t
        beats = []
        for bi, b in enumerate(sc["beats"]):
            ev = dict(b)
            ev["start"] = t
            if "say" in b:
                lid = f"{sc['id']}-{bi + 1:02d}-{b['say']}"
                sheet.append((lid, voices[b["say"]]["name"], b["tts"]))
                clip = synth_voice(b["tts"], voices[b["say"]], cache, line_id=lid)
                d = len(clip) / SR
                vox_clips.append((clip, t))
                ev["env"] = envelope(clip)
                ev["dur"] = max(d + LINE_GAP, b.get("dur", 0))
                ass.append(f"Dialogue: 0,{ass_time(t)},{ass_time(t + d + 0.15)},Sub,,0,0,0,,{plain(b['tts'])}")
            elif "song" in b:
                sg = story["songs"][b["song"]]
                music, vox, timings = song(b["song"], sg["lines"], cache, voices)
                write_wav(os.path.join(build, f"guide-{b['song']}.wav"), music * 0.8)
                sheet.append((f"song-{b['song']}", "الكورال (غناء)", " / ".join(sg["lines"])))
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
                           "{\\pos(960,190)\\fscx20\\fscy20\\t(0,350,\\fscx112\\fscy112)\\t(350,520,\\fscx100\\fscy100)\\fad(0,300)}"
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
    with open(os.path.join(build, "recording-sheet.md"), "w") as f:
        f.write("# Recording sheet\n\nSave each take as `recordings/<file>.wav` in the episode folder, then rebuild.\n"
                "Songs: sing the whole song over `build/guide-<song>.wav` (headphones) and save as `song-<song>.wav`.\n\n"
                "| File | Character | Line |\n| --- | --- | --- |\n")
        seen = set()
        for lid, who, text in sheet:
            if lid not in seen:
                seen.add(lid)
                f.write(f"| `{lid}.wav` | {who} | {text} |\n")
    print(f"audio {total:.1f}s, {len(scenes)} scenes, {sum(len(s['beats']) for s in scenes)} beats")


if __name__ == "__main__":
    if "--voices" in sys.argv:
        PROVIDER = sys.argv[sys.argv.index("--voices") + 1]
    main(sys.argv[1])
