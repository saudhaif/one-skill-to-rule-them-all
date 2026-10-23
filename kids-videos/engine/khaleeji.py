"""Gulf sea-music colour, synthesised: the نهّام's free-rhythm call (يا مال), the sailors' humming drone,
oud, rows of clapping, and the جحلة / مرواس drums. Melodies use maqam Bayati with its quarter-tone.

This is an evocation built from synthesis, not a recording of real نهمة. A real نهّام take dropped into
recordings/ always wins (see build_audio.py).
"""
import numpy as np
from scipy.signal import lfilter

SR = 44100
rng = np.random.default_rng(11)

# Bayati on D: D, E half-flat, F, G, A, Bb, C, D
NOTE = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def hz(name):
    """'D4', 'Bb3', 'F#4', 'Eh4' (h = half-flat, a quarter-tone below the natural)."""
    semis = NOTE[name[0]]
    mod = name[1:-1]
    semis += {"": 0, "#": 1, "b": -1, "h": -0.5}[mod]
    octave = int(name[-1])
    return 440.0 * 2 ** ((semis + 12 * (octave + 1) - 69) / 12.0)


def t_axis(dur):
    return np.arange(int(dur * SR)) / SR


# ---------- instruments ----------

def oud(f, dur=0.9, vel=1.0):
    """Plucked string (Karplus-Strong), dark and woody."""
    n = int(dur * SR)
    p = max(2, int(round(SR / f)))
    y = np.zeros(n + p + 1)
    y[:p] = rng.uniform(-1, 1, p) * np.hanning(p)  # soft pick
    decay = 0.996 - 0.0009 * (f / 440)
    i = p
    while i < n + p:
        j = min(i + p, n + p)
        seg = np.arange(i, j)
        y[seg] = decay * 0.5 * (y[seg - p] + y[seg - p - 1])
        i = j
    out = y[p:p + n]
    out = lfilter([0.6, 0.4], [1.0], out)  # take a little brightness off
    return out * vel * 0.55


def jahla(vel=1.0):
    """Clay-pot drum: a deep, round 'doom' with a downward bend."""
    t = t_axis(0.5)
    f = 70 + 45 * np.exp(-t * 18)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7)
    slap = rng.standard_normal(len(t)) * np.exp(-t * 90) * 0.15
    return (body + slap) * vel * 0.7


def mirwas(vel=1.0):
    """Small double-headed hand drum: a dry high 'tak'."""
    t = t_axis(0.12)
    tone = np.sin(2 * np.pi * 420 * t) * np.exp(-t * 45)
    n = lfilter([1, -1], [1], rng.standard_normal(len(t))) * np.exp(-t * 70) * 0.25
    return (tone + n) * vel * 0.35


def clap_row(vel=1.0, people=6):
    """A row of men clapping together: several claps a few ms apart, so it sounds like a group, not a machine."""
    out = np.zeros(int(0.25 * SR))
    for k in range(people):
        t = t_axis(0.16)
        n = lfilter([1, -1], [1], rng.standard_normal(len(t)))
        env = np.exp(-t * 38)
        off = int(abs(rng.normal(0, 0.007)) * SR)
        seg = n * env * rng.uniform(0.6, 1.0)
        out[off:off + len(seg)] += seg[: len(out) - off]
    return out / people * 0.55 * vel


# ---------- voices ----------

VOWELS = {  # formant frequencies (Hz) and bandwidths for a deep male voice
    "a": ((700, 1150, 2500), (90, 110, 160)),
    "aa": ((650, 1050, 2450), (90, 110, 160)),
    "i": ((300, 2100, 2800), (60, 100, 150)),
    "u": ((320, 800, 2300), (60, 90, 140)),
    "m": ((260, 1000, 2400), (60, 300, 400)),
}


def _resonator(f, bw):
    r = np.exp(-np.pi * bw / SR)
    c = 2 * r * np.cos(2 * np.pi * f / SR)
    return [1 - r], [1, -c, r * r]


def voice(f0, vowel_track, breath=0.04, gain=1.0):
    """Source-filter voice: glottal pulses at f0 (array) through three formant resonators, vowel per sample block."""
    # additive glottal source: harmonics falling off ~ -7 dB/octave, none above 5 kHz (smooth, not buzzy)
    phase = 2 * np.pi * np.cumsum(f0 / SR)
    src = np.zeros(len(f0))
    for k in range(1, int(5000 / max(60.0, float(np.min(f0)))) + 1):
        amp = k ** -1.2 * (f0 * k < 5000)
        src += amp * np.sin(k * phase)
    src = src / (np.max(np.abs(src)) + 1e-9)
    src += lfilter([1], [1, -0.9], rng.standard_normal(len(src))) * breath * 0.3
    out = np.zeros_like(src)
    block = 256
    zis = [np.zeros(2) for _ in range(3)]
    for s in range(0, len(src), block):
        v = VOWELS[vowel_track[min(s, len(vowel_track) - 1)]]
        chunk = src[s:s + block]
        acc = np.zeros_like(chunk)
        for k in range(3):
            b, a = _resonator(v[0][k], v[1][k])
            y, zis[k] = lfilter(b, a, chunk, zi=zis[k])
            acc += y * (1.0, 0.5, 0.25)[k]
        out[s:s + block] = acc
    out = out / (np.max(np.abs(out)) + 1e-9)
    return out * gain


def _contour(notes):
    """notes: list of (note_name, seconds, vowel). Returns f0 and vowel per sample with slides and vibrato."""
    f0, vow = [], []
    prev = hz(notes[0][0])
    for name, dur, v in notes:
        target = hz(name)
        n = int(dur * SR)
        t = np.arange(n) / SR
        glide = min(0.09, dur * 0.4)
        bend = np.where(t < glide, prev + (target - prev) * (t / glide) ** 0.7, target)
        vib_depth = 0.022 * np.clip((t - 0.25) / 0.6, 0, 1)  # vibrato blooms on held notes
        bend = bend * (1 + vib_depth * np.sin(2 * np.pi * 5.3 * t))
        f0.append(bend)
        vow += [v] * n
        prev = target
    return np.concatenate(f0), vow


# The call: «يا… مال…», rising, ornamented, falling back home to D. Free rhythm.
YA_MAL = [
    ("A3", 0.35, "i"), ("D4", 0.9, "aa"), ("Eh4", 0.25, "aa"), ("F4", 0.25, "aa"), ("G4", 0.7, "aa"),
    ("F4", 0.18, "aa"), ("G4", 0.18, "aa"), ("A4", 1.3, "aa"), ("Bb4", 0.25, "aa"), ("A4", 0.3, "aa"),
    ("G4", 0.25, "aa"), ("F4", 0.5, "aa"), ("Eh4", 0.35, "aa"), ("D4", 0.25, "m"), ("D4", 0.25, "aa"),
    ("D4", 0.25, "a"), ("D4", 0.9, "m"),
]
YA_MAL_SHORT = [
    ("A3", 0.3, "i"), ("D4", 0.6, "aa"), ("F4", 0.35, "aa"), ("G4", 0.9, "aa"), ("F4", 0.25, "aa"),
    ("Eh4", 0.35, "aa"), ("D4", 0.3, "m"), ("D4", 0.8, "m"),
]


def nahham(phrase=YA_MAL, octave_down=1):
    """The solo نهّام voice. Sung an octave down from the written line: a deep, chesty sea voice."""
    notes = [(n[:-1] + str(int(n[-1]) - octave_down), d, v) for n, d, v in phrase]
    f0, vow = _contour(notes)
    x = voice(f0, vow, breath=0.05)
    n = len(x)
    t = np.arange(n) / SR
    env = np.minimum(1, t / 0.15) * np.minimum(1, (n / SR - t) / 0.6)
    return x * env * 0.5


def hum(dur, notes=("D2", "A2", "D3"), gain=0.35):
    """The sailors' humming drone under the نهّام: several men on the tonic and fifth, slightly out of step."""
    n = int(dur * SR)
    out = np.zeros(n)
    for k, name in enumerate(notes * 2):
        f = hz(name) * (1 + rng.normal(0, 0.003))
        t = np.arange(n) / SR
        f0 = f * (1 + 0.004 * np.sin(2 * np.pi * (0.2 + 0.07 * k) * t + k))
        out += voice(f0, ["m"] * n, breath=0.02) * rng.uniform(0.6, 1.0)
    t = np.arange(n) / SR
    swell = 0.75 + 0.25 * np.sin(2 * np.pi * t / 6.0 - 1.5)
    env = np.minimum(1, t / 1.2) * np.minimum(1, (dur - t) / 1.2)
    return out / (len(notes) * 2) * swell * env * gain * 2.2


def sea_call(short=False):
    """نهّام over the sailors' hum: used as the opening and closing signature."""
    lead = nahham(YA_MAL_SHORT if short else YA_MAL)
    d = len(lead) / SR + 1.2
    out = hum(d, gain=0.3)
    out[int(0.4 * SR):int(0.4 * SR) + len(lead)] += lead
    return out
