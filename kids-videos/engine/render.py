"""Render an episode's video from story.json + build/timeline.json, then mux audio and burn subtitles.

Usage: python3 engine/render.py episodes/01-zafran [--frame SECONDS] [--workers N]
  --frame renders a single PNG preview at that time instead of the whole video.
"""
import json
import math
import os
import subprocess
import sys
from multiprocessing import Pool

import cairo

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from characters import CAST, SIDE_VIEW, SIZE, ellipse, heart, paint, rgb, src  # noqa: E402

W, H = 1920, 1080
GROUND = 0.86
UNIT = H / 1080 * 1.05  # character px per drawing unit at scale 1
SPEAKER = {"H": "hamdan", "M": "maitha", "Z": "zafran", "F": "falcon", "O": "oryx", "R": "hare",
           "MOM": "mom", "N": "yadda"}
SINGERS = {"hamdan", "maitha", "zafran", "mom", "hare"}
WALK_SPEED = 260.0  # background scroll, px/s


# ---------- easing ----------

def ease(u):
    u = max(0.0, min(1.0, u))
    return u * u * (3 - 2 * u)


def back_out(u):
    u = max(0.0, min(1.0, u))
    c = 1.9
    return 1 + (c + 1) * (u - 1) ** 3 + c * (u - 1) ** 2


# ---------- scenery ----------

def sky(ctx, top, bottom):
    g = cairo.LinearGradient(0, 0, 0, H * 0.8)
    g.add_color_stop_rgba(0, *rgb(top))
    g.add_color_stop_rgba(1, *rgb(bottom))
    ctx.set_source(g)
    ctx.paint()


def sun(ctx, x, y, r, col="#FFE066"):
    g = cairo.RadialGradient(x, y, r * 0.5, x, y, r * 3)
    g.add_color_stop_rgba(0, *rgb(col, 0.55))
    g.add_color_stop_rgba(1, *rgb(col, 0.0))
    ctx.set_source(g)
    ctx.arc(x, y, r * 3, 0, 2 * math.pi)
    ctx.fill()
    ctx.arc(x, y, r, 0, 2 * math.pi)
    src(ctx, col)
    ctx.fill()


def clouds(ctx, t, n=4, alpha=0.9):
    for i in range(n):
        x = (i * 610 + t * (12 + i * 4)) % (W + 500) - 250
        y = 120 + (i * 97) % 180
        s = 0.8 + (i % 3) * 0.25
        for dx, dy, r in ((0, 0, 55), (55, -25, 65), (115, 0, 55), (60, 15, 60)):
            ellipse(ctx, x + dx * s, y + dy * s, r * s, r * s * 0.85)
        src(ctx, "#FFFFFF", alpha)
        ctx.fill()


def dune(ctx, base, amp, wave, offset, top, bottom, phase=0.0):
    ctx.move_to(-10, H + 10)
    x = -10
    while x <= W + 10:
        xx = x + offset
        y = base * H - amp * (math.sin(xx / wave + phase) * 0.6 + math.sin(xx / (wave * 0.53) + phase * 2) * 0.4)
        ctx.line_to(x, y)
        x += 12
    ctx.line_to(W + 10, H + 10)
    ctx.close_path()
    g = cairo.LinearGradient(0, (base - 0.1) * H, 0, H)
    g.add_color_stop_rgba(0, *rgb(top))
    g.add_color_stop_rgba(1, *rgb(bottom))
    ctx.set_source(g)
    ctx.fill()


def palm(ctx, x, y, s, t=0.0, lean=0.08):
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(s, s)
    sway = math.sin(t * 1.3 + x) * 0.03
    # trunk made of rings
    top_x, top_y = 380 * (lean + sway), -420
    for k in range(14):
        u = k / 14
        cx = top_x * u * u
        cy = top_y * u
        ellipse(ctx, cx, cy, 26 - 8 * u, 18)
        paint(ctx, "#A4693B" if k % 2 else "#8B5530", "#5A3A1E", 3)
    # dates
    for k in range(5):
        ellipse(ctx, top_x - 12 + k * 7, top_y + 26 + (k % 2) * 8, 9, 11)
        paint(ctx, "#E2711D", "#7A3A0A", 2)
    # fronds
    for k in range(9):
        a = math.pi * (1.05 + k * 0.11) + sway * 3
        ln = 190 - abs(k - 4) * 12
        ex, ey = top_x + math.cos(a) * ln, top_y + math.sin(a) * ln * 0.55 + 70
        mx, my = top_x + math.cos(a) * ln * 0.5, top_y + math.sin(a) * ln * 0.5 - 40
        ctx.move_to(top_x, top_y)
        ctx.curve_to(mx, my - 20, ex, ey - 30, ex, ey)
        ctx.curve_to(ex - math.cos(a) * 30, ey - 6, mx, my + 22, top_x, top_y + 6)
        paint(ctx, "#2E9E4F" if k % 2 else "#23843F", "#145A2A", 3)
    ctx.restore()


def ghaf(ctx, x, y, s):
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(s, s)
    ctx.move_to(-30, 0)
    ctx.curve_to(-20, -120, -70, -200, -40, -300)
    ctx.line_to(10, -300)
    ctx.curve_to(0, -220, 40, -120, 35, 0)
    ctx.close_path()
    paint(ctx, "#7B5536", "#4A3020", 4)
    for dx, dy, r, c in ((-170, -310, 110, "#5E8F3A"), (150, -320, 120, "#5E8F3A"), (-10, -390, 150, "#6FA544"),
                         (-120, -400, 100, "#7DB34F"), (110, -420, 110, "#7DB34F"), (0, -470, 110, "#89BF59")):
        ellipse(ctx, dx, dy, r * 1.25, r * 0.75)
        paint(ctx, c)
    ctx.restore()


def footprints(ctx, x, y, big, alpha=1.0):
    n, sz, gap = (4, 26, 85) if big else (5, 14, 50)
    for k in range(n):
        px = x + k * gap * 0.9 - gap * n / 2
        py = y + (12 if k % 2 else -12)
        for side in (-1, 1):
            ellipse(ctx, px, py + side * sz * 0.55, sz, sz * 0.45, 0.2)
            src(ctx, "#B9864E", 0.8 * alpha)
            ctx.fill()


def desert(ctx, t, scroll, dawn=False, ghaf_tree=False, palms=False):
    if dawn:
        sky(ctx, "#5B6FD6", "#FFB38A")
        sun(ctx, W * 0.72, H * 0.58, 70, "#FFD27A")
    else:
        sky(ctx, "#3FA9F5", "#BFE9FF")
        sun(ctx, W * 0.84, H * 0.16, 70)
    clouds(ctx, t + scroll / 60, alpha=0.75 if dawn else 0.92)
    dune(ctx, 0.62, 40, 260, scroll * 0.2, "#F3C97A", "#E8A95A", 1.0)
    if palms:
        for i, (px, sc) in enumerate(((0.08, 0.55), (0.2, 0.42), (0.92, 0.5))):
            palm(ctx, ((px * W - scroll * 0.35) % (W + 300)) - 150, H * 0.7, sc, t)
    dune(ctx, 0.74, 55, 320, scroll * 0.5, "#F7D58E", "#EDB565", 2.4)
    if ghaf_tree:
        ghaf(ctx, W * 0.82 - scroll * 0.5, H * 0.8, 0.85)
    dune(ctx, 0.9, 30, 400, scroll, "#FCE2A6", "#F2C27A", 0.3)
    # sand speckles
    for k in range(40):
        sx = (k * 197 - scroll) % W
        sy = H * (0.9 + (k * 37 % 100) / 1000)
        ellipse(ctx, sx, sy, 3, 2)
        src(ctx, "#D9A35C", 0.6)
        ctx.fill()


def oasis(ctx, t, scroll):
    sky(ctx, "#3FA9F5", "#C8F0FF")
    sun(ctx, W * 0.15, H * 0.15, 65)
    clouds(ctx, t)
    dune(ctx, 0.64, 40, 260, 0, "#F3C97A", "#E8A95A", 1.0)
    for px, sc in ((0.05, 0.6), (0.3, 0.5), (0.62, 0.55), (0.95, 0.62), (0.47, 0.45)):
        palm(ctx, px * W, H * 0.72, sc, t)
    # green ground
    dune(ctx, 0.8, 18, 300, 0, "#8ED36B", "#5FAE4A", 0.5)
    # falaj channel feeding a pool
    ctx.move_to(-20, H * 0.83)
    ctx.curve_to(W * 0.25, H * 0.8, W * 0.35, H * 0.88, W * 0.5, H * 0.87)
    src(ctx, "#4FC3F7")
    ctx.set_line_width(26)
    ctx.stroke()
    ellipse(ctx, W * 0.55, H * 0.9, W * 0.16, H * 0.045)
    g = cairo.LinearGradient(0, H * 0.86, 0, H * 0.95)
    g.add_color_stop_rgba(0, *rgb("#4FC3F7"))
    g.add_color_stop_rgba(1, *rgb("#0288D1"))
    ctx.set_source(g)
    ctx.fill()
    for k in range(4):
        r = (t * 40 + k * 30) % 120
        ellipse(ctx, W * 0.55, H * 0.9, r * 2.2, r * 0.35)
        src(ctx, "#FFFFFF", max(0, 0.5 - r / 240))
        ctx.set_line_width(3)
        ctx.stroke()
    for k in range(18):  # flowers
        fx, fy = (k * 113) % W, H * (0.95 + (k % 3) * 0.015)
        ellipse(ctx, fx, fy, 9, 9)
        src(ctx, ("#FF6F91", "#FFD54F", "#FFFFFF")[k % 3])
        ctx.fill()


def majlis(ctx, t, scroll):
    g = cairo.LinearGradient(0, 0, 0, H)
    g.add_color_stop_rgba(0, *rgb("#F6E3C4"))
    g.add_color_stop_rgba(1, *rgb("#E9C99A"))
    ctx.set_source(g)
    ctx.paint()
    # arched windows looking out to the desert
    for wx in (0.18, 0.82):
        x0, y0, ww, hh = W * wx - 150, H * 0.14, 300, 380

        def arch():
            ctx.move_to(x0, y0 + hh)
            ctx.line_to(x0, y0 + 150)
            ctx.arc(x0 + 150, y0 + 150, 150, math.pi, 2 * math.pi)
            ctx.line_to(x0 + ww, y0 + hh)
            ctx.close_path()
        ctx.save()
        arch()
        ctx.clip()
        sky(ctx, "#59B9F7", "#FFE3A3")
        dune(ctx, 0.42, 20, 140, wx * 900, "#F3C97A", "#E8A95A", 1.0)
        ctx.restore()
        arch()
        src(ctx, "#8B5A2B")
        ctx.set_line_width(16)
        ctx.stroke()
    # carpet
    ctx.rectangle(0, H * 0.78, W, H * 0.22)
    src(ctx, "#B71C1C")
    ctx.fill()
    for k in range(0, W, 60):
        ctx.move_to(k, H * 0.8)
        ctx.line_to(k + 30, H * 0.83)
        ctx.line_to(k + 60, H * 0.8)
        src(ctx, "#FFC93C")
        ctx.set_line_width(5)
        ctx.stroke()
    # floor cushions along the wall
    for k in range(6):
        cx = k * 340 + 60
        if 0.33 * W < cx < 0.67 * W:
            continue
        ctx.rectangle(cx, H * 0.66, 300, H * 0.12)
        src(ctx, "#1B5E20" if k % 2 else "#B71C1C")
        ctx.fill()
        ctx.rectangle(cx, H * 0.66, 300, 14)
        src(ctx, "#FFC93C")
        ctx.fill()
    # dallah (coffee pot)
    dx, dy = W * 0.72, H * 0.86
    ellipse(ctx, dx, dy - 50, 48, 55)
    paint(ctx, "#E0B33A", "#8C6512", 4)
    ctx.move_to(dx + 40, dy - 70)
    ctx.curve_to(dx + 90, dy - 100, dx + 95, dy - 120, dx + 110, dy - 125)
    src(ctx, "#C9962A")
    ctx.set_line_width(12)
    ctx.stroke()
    ellipse(ctx, dx, dy - 118, 22, 30)
    paint(ctx, "#E0B33A", "#8C6512", 4)
    ellipse(ctx, dx, dy - 152, 9, 9)
    paint(ctx, "#E0B33A", "#8C6512", 3)


BACKGROUNDS = {
    "desert_dawn": lambda c, t, s: desert(c, t, s, dawn=True),
    "desert_day": lambda c, t, s: desert(c, t, s),
    "desert_ghaf": lambda c, t, s: desert(c, t, s, ghaf_tree=True),
    "desert_palms": lambda c, t, s: desert(c, t, s, palms=True),
    "oasis": oasis,
    "majlis": majlis,
}


# ---------- scene state ----------

class Scene:
    def __init__(self, spec, tl):
        self.spec = spec
        self.start = tl["start"]
        self.dur = tl["dur"]
        self.beats = tl["beats"]
        # keyframes per character: list of (t0, t1, (x0,y0), (x1,y1))
        self.pos = {}
        self.moves = {n: [] for n in spec["cast"]}
        self.changes = []  # (t, kind, who, value)
        cur = {n: (c["x"], c.get("y", GROUND)) for n, c in spec["cast"].items()}
        self.home = dict(cur)
        for b in self.beats:
            t0 = b["start"]
            for who, tgt in b.get("move", {}).items():
                frm = cur[who]
                to = (tgt[0], tgt[1] if len(tgt) > 1 else frm[1])
                d = min(max(b["dur"], 0.8), 2.2)
                self.moves[who].append((t0, t0 + d, frm, to))
                cur[who] = to
            for kind in ("emote", "face"):
                for who, v in b.get(kind, {}).items():
                    self.changes.append((t0, kind, who, v))
        self.props = spec.get("props", {})

    def position(self, who, t):
        p = self.home[who]
        moving = False
        for t0, t1, a, b in self.moves[who]:
            if t >= t1:
                p = b
            elif t >= t0:
                u = ease((t - t0) / (t1 - t0))
                p = (a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u)
                moving = (b[0] - a[0], b[1] - a[1])
                break
            else:
                break
        return p, moving

    def attr(self, who, kind, t, default):
        v = self.spec["cast"][who].get(kind, default)
        for t0, k, w, val in self.changes:
            if t0 <= t and k == kind and w == who:
                v = val
        return v

    def beat_at(self, t):
        cur = self.beats[0]
        for b in self.beats:
            if b["start"] <= t:
                cur = b
        return cur


def mouth_for(scene, who, t):
    for b in scene.beats:
        if not (b["start"] <= t < b["start"] + b["dur"]) or "env" not in b:
            continue
        if "say" in b and SPEAKER.get(b["say"]) != who:
            continue
        if "song" in b and who not in SINGERS:
            continue
        i = int((t - b["start"]) * 25)
        env = b["env"]
        return env[i] if 0 <= i < len(env) else 0.0
    return 0.0


def jump_for(scene, who, t):
    for b in scene.beats:
        if who in b.get("jump", []) and 0 <= t - b["start"] < 0.9:
            u = (t - b["start"]) / 0.45
            return abs(math.sin(math.pi * u)) * 55
    return 0.0


# ---------- frame ----------

def draw_frame(ctx, scenes, t):
    sc = scenes[-1]
    for s in scenes:
        if s.start <= t < s.start + s.dur:
            sc = s
            break
    lt = t - sc.start
    walk = sc.spec.get("walk", False)
    party = sc.spec.get("party", False)
    scroll = lt * WALK_SPEED if walk else 0.0
    BACKGROUNDS[sc.spec["bg"]](ctx, t, scroll)
    beat = sc.beat_at(t)

    # props
    for name, p in sc.props.items():
        shown_at = None
        if not p.get("hidden"):
            shown_at = -99
        for b in sc.beats:
            if name in b.get("reveal", []) and b["start"] <= t:
                shown_at = b["start"]
        if shown_at is None:
            continue
        k = max(0.02, back_out((t - shown_at) / 0.4)) if shown_at > 0 else 1.0
        x, y = p["x"] * W, p["y"] * H
        if p["type"] == "palm":
            palm(ctx, x, y, p["s"] * 0.75 * k, t)
        elif p["type"].startswith("prints"):
            ctx.save()
            ctx.translate(x, y)
            ctx.scale(k, k)
            footprints(ctx, 0, 0, p["type"] == "prints_big")
            ctx.restore()
        if beat.get("point") == name and beat["start"] <= t:
            bob = math.sin(t * 8) * 14
            ay = y - 140 + bob
            ctx.move_to(x, ay + 60)
            ctx.line_to(x - 34, ay)
            ctx.line_to(x - 14, ay)
            ctx.line_to(x - 14, ay - 50)
            ctx.line_to(x + 14, ay - 50)
            ctx.line_to(x + 14, ay)
            ctx.line_to(x + 34, ay)
            ctx.close_path()
            paint(ctx, "#FF4F7B", "#FFFFFF", 6)

    # characters, back to front by y then x
    order = sorted(sc.spec["cast"], key=lambda n: (sc.position(n, t)[0][1], n == "falcon"))
    for i, who in enumerate(order):
        c = sc.spec["cast"][who]
        (px, py), moving = sc.position(who, t)
        face = sc.attr(who, "face", t, "right")
        if moving and abs(moving[0]) > 0.01:
            face = "right" if moving[0] > 0 else "left"
        flip = -1 if face == "left" else 1
        walking = bool(moving) or (walk and who != "falcon")
        st = {
            "t": t + i * 0.37,
            "emote": sc.attr(who, "emote", t, "happy"),
            "mouth": mouth_for(sc, who, t),
            "blink": ((t + i * 1.3) % 3.4) < 0.13,
            "walking": walking,
            "phase": (t * 9.0 + i) if walking else 0.0,
            "look": 0.6 * flip,
            "flying": who == "falcon" and (moving or py < GROUND - 0.3),
        }
        if who in ("hamdan", "maitha") and beat.get("say") in ("H", "M") and SPEAKER[beat["say"]] == who \
                and beat.get("jump") and who in beat["jump"]:
            st["wave"] = 1.0
        bob = abs(math.sin(st["phase"])) * 10 if walking and who != "falcon" else 0
        if party:
            bob = abs(math.sin(math.pi * t / (60 / 112))) * 26
        lift = jump_for(sc, who, t) + bob
        breathe = 1 + 0.012 * math.sin(t * 2.4 + i)
        s = c.get("s", 1.0) * SIZE[who] * UNIT
        ctx.save()
        ctx.translate(px * W, py * H - lift)
        # ground shadow
        if who != "falcon":
            ctx.save()
            ctx.translate(0, lift)
            ellipse(ctx, 0, 0, 110 * s, 16 * s)
            src(ctx, "#000000", 0.12)
            ctx.fill()
            ctx.restore()
        ctx.scale(s * (flip if who in SIDE_VIEW else 1), s * breathe)
        if who not in SIDE_VIEW:
            st["look"] = 0.5 * flip
        if who == "zafran" or who == "mom":
            ctx.translate(-30, 0)
        CAST[who](ctx, st)
        ctx.restore()

    # hearts and party confetti
    for b in sc.beats:
        if b.get("hearts") and b["start"] <= t:
            for k in range(6):
                u = ((t - b["start"]) * 0.5 + k / 6) % 1.0
                hx = W * (0.68 + 0.08 * math.sin(k * 2 + u * 6))
                heart(ctx, hx, H * (0.5 - 0.35 * u), 26 + 8 * (k % 2), a=1 - u)
    if party:
        for k in range(90):
            u = ((t * (0.18 + (k % 5) * 0.03)) + k * 0.137) % 1.0
            cx = (k * 211 + math.sin(t * 2 + k) * 40) % W
            ctx.save()
            ctx.translate(cx, u * H * 1.1 - 40)
            ctx.rotate(t * 3 + k)
            ctx.rectangle(-9, -5, 18, 10)
            src(ctx, ("#FF4F7B", "#FFC93C", "#29B6F6", "#66BB6A", "#AB47BC")[k % 5])
            ctx.fill()
            ctx.restore()
    if beat.get("dots") and beat["start"] <= t:
        n = min(3, int((t - beat["start"]) / (beat["dur"] / 3)) + 1)
        for k in range(n):
            ellipse(ctx, W / 2 + (k - 1) * 70, H * 0.42, 22, 22)
            paint(ctx, "#FFFFFF", "#3A2618", 5)
    # flash in at each scene cut
    if lt < 0.25:
        ctx.rectangle(0, 0, W, H)
        src(ctx, "#FFFFFF", 1 - lt / 0.25)
        ctx.fill()


def load(ep):
    story = json.load(open(os.path.join(ep, "story.json")))
    tl = json.load(open(os.path.join(ep, "build", "timeline.json")))
    scenes = [Scene(spec, s) for spec, s in zip(story["scenes"], tl["scenes"])]
    return story, tl, scenes


def render_chunk(args):
    ep, f0, f1, path = args
    _, tl, scenes = load(ep)
    fps = tl["fps"]
    surf = cairo.ImageSurface(cairo.FORMAT_RGB24, W, H)
    proc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr0", "-s", f"{W}x{H}",
                             "-r", str(fps), "-i", "-", "-c:v", "libx264", "-preset", "veryfast", "-crf", "16",
                             "-pix_fmt", "yuv420p", path], stdin=subprocess.PIPE)
    for f in range(f0, f1):
        ctx = cairo.Context(surf)
        draw_frame(ctx, scenes, f / fps)
        surf.flush()
        proc.stdin.write(bytes(surf.get_data()))
    proc.stdin.close()
    proc.wait()
    return path


def main():
    ep = sys.argv[1]
    args = sys.argv[2:]
    build = os.path.join(ep, "build")
    story, tl, scenes = load(ep)
    if "--frame" in args:
        t = float(args[args.index("--frame") + 1])
        surf = cairo.ImageSurface(cairo.FORMAT_RGB24, W, H)
        draw_frame(cairo.Context(surf), scenes, t)
        out = os.path.join(build, f"frame_{t:06.2f}.png")
        surf.write_to_png(out)
        print(out)
        return
    workers = int(args[args.index("--workers") + 1]) if "--workers" in args else os.cpu_count()
    fps = tl["fps"]
    total = int(tl["duration"] * fps)
    step = math.ceil(total / workers)
    jobs = [(ep, i, min(total, i + step), os.path.join(build, f"part_{k:02d}.mp4"))
            for k, i in enumerate(range(0, total, step))]
    with Pool(len(jobs)) as pool:
        parts = pool.map(render_chunk, jobs)
    listing = os.path.join(build, "parts.txt")
    with open(listing, "w") as f:
        f.writelines(f"file '{os.path.abspath(p)}'\n" for p in parts)
    slug = os.path.basename(os.path.normpath(ep))
    out = os.path.join(build, f"{slug}.mp4")
    subs = os.path.abspath(os.path.join(build, "subs.ass"))
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", listing,
                    "-i", os.path.join(build, "audio.wav"),
                    "-vf", f"ass={subs}", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11",
                    "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-r", str(fps),
                    "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", "-shortest", out],
                   check=True)
    for p in parts:
        os.remove(p)
    os.remove(listing)
    print(out)


if __name__ == "__main__":
    main()
