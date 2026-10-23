"""Cartoon cast, drawn with cairo. Every character is drawn around its feet at (0, 0), y up is negative.

state keys: mouth (0..1), blink (bool), emote (happy|sad|surprised|love), look (-1..1), phase (walk cycle, radians),
walking (bool), t (seconds), flying (bool, falcon only).
"""
import math

PI = math.pi


def rgb(h, a=1.0):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)) + (a,)


def src(ctx, h, a=1.0):
    ctx.set_source_rgba(*rgb(h, a))


def ellipse(ctx, cx, cy, rx, ry, rot=0.0):
    if rx < 0.05 or ry < 0.05:
        return
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(rot)
    ctx.scale(rx, ry)
    ctx.new_sub_path()
    ctx.arc(0, 0, 1, 0, 2 * PI)
    ctx.restore()


def rrect(ctx, x, y, w, h, r):
    ctx.new_sub_path()
    ctx.arc(x + w - r, y + r, r, -PI / 2, 0)
    ctx.arc(x + w - r, y + h - r, r, 0, PI / 2)
    ctx.arc(x + r, y + h - r, r, PI / 2, PI)
    ctx.arc(x + r, y + r, r, PI, 3 * PI / 2)
    ctx.close_path()


def paint(ctx, fill, line=None, lw=5, a=1.0):
    src(ctx, fill, a)
    if line:
        ctx.fill_preserve()
        src(ctx, line)
        ctx.set_line_width(lw)
        ctx.stroke()
    else:
        ctx.fill()


def capsule(ctx, x1, y1, x2, y2, w, fill, line):
    ctx.set_line_cap(1)  # round
    ctx.move_to(x1, y1)
    ctx.line_to(x2, y2)
    src(ctx, line)
    ctx.set_line_width(w + 8)
    ctx.stroke()
    ctx.move_to(x1, y1)
    ctx.line_to(x2, y2)
    src(ctx, fill)
    ctx.set_line_width(w)
    ctx.stroke()


# ---------- faces ----------

def eyes(ctx, cx, cy, gap, r, st, lashes=False, iris="#3B2314"):
    emote = st.get("emote", "happy")
    look = st.get("look", 0.0)
    for side in (-1, 1):
        ex = cx + side * gap
        if emote == "love" or st.get("blink"):
            ctx.set_line_cap(1)
            ctx.set_line_width(r * 0.32)
            src(ctx, "#2A1A10")
            if emote == "love":
                ctx.arc(ex, cy + r * 0.25, r * 0.7, PI * 1.1, PI * 1.9)
            else:
                ctx.move_to(ex - r * 0.8, cy)
                ctx.curve_to(ex - r * 0.3, cy + r * 0.35, ex + r * 0.3, cy + r * 0.35, ex + r * 0.8, cy)
            ctx.stroke()
            continue
        ellipse(ctx, ex, cy, r * 0.9, r * 1.12)
        paint(ctx, "#FFFFFF", "#2A1A10", r * 0.12)
        px = ex + look * r * 0.32
        pr = r * (0.7 if emote != "surprised" else 0.55)
        ellipse(ctx, px, cy + r * 0.12, pr * 0.85, pr)
        src(ctx, iris)
        ctx.fill()
        ellipse(ctx, px, cy + r * 0.15, pr * 0.5, pr * 0.58)
        src(ctx, "#120A05")
        ctx.fill()
        ellipse(ctx, px - pr * 0.3, cy - pr * 0.3, pr * 0.28, pr * 0.28)
        ellipse(ctx, px + pr * 0.25, cy + pr * 0.35, pr * 0.12, pr * 0.12)
        src(ctx, "#FFFFFF")
        ctx.fill()
        if lashes:
            src(ctx, "#2A1A10")
            ctx.set_line_width(r * 0.14)
            ctx.set_line_cap(1)
            for k in (-1, 0, 1):
                a = -PI / 2 + side * (0.55 + 0.35 * k * side)
                ctx.move_to(ex + math.cos(a) * r * 0.9, cy + math.sin(a) * r * 1.1)
                ctx.line_to(ex + math.cos(a) * r * 1.35, cy + math.sin(a) * r * 1.5)
                ctx.stroke()
    # brows
    src(ctx, "#2A1A10")
    ctx.set_line_width(r * 0.22)
    ctx.set_line_cap(1)
    for side in (-1, 1):
        ex = cx + side * gap
        by = cy - r * 1.55
        if emote == "sad":
            ctx.move_to(ex - side * r * 0.7, by - r * 0.1)
            ctx.line_to(ex + side * r * 0.6, by + r * 0.25)
        elif emote == "surprised":
            ctx.arc(ex, by + r * 0.1, r * 0.7, PI * 1.15, PI * 1.85)
        else:
            ctx.arc(ex, by + r * 0.45, r * 0.75, PI * 1.25, PI * 1.75)
        ctx.stroke()


def mouth(ctx, cx, cy, w, st, tongue=True):
    emote = st.get("emote", "happy")
    m = st.get("mouth", 0.0)
    src(ctx, "#2A1A10")
    ctx.set_line_cap(1)
    if m > 0.08 or emote == "surprised":
        h = w * (0.18 + 0.55 * m) if emote != "surprised" else w * (0.35 + 0.3 * m)
        mw = w * (0.75 if emote != "surprised" else 0.45)
        if emote == "sad":
            ellipse(ctx, cx, cy + h * 0.2, mw * 0.4, h * 0.45)
        else:
            ctx.move_to(cx - mw / 2, cy - h * 0.15)
            ctx.curve_to(cx - mw / 2, cy + h, cx + mw / 2, cy + h, cx + mw / 2, cy - h * 0.15)
            ctx.close_path()
        ctx.save()
        paint(ctx, "#6B1F24", "#2A1A10", w * 0.07)
        ctx.restore()
        if tongue and emote != "sad":
            ellipse(ctx, cx, cy + h * 0.55, mw * 0.25, h * 0.22)
            src(ctx, "#F07A86")
            ctx.fill()
        return
    ctx.set_line_width(w * 0.09)
    if emote == "sad":
        ctx.arc(cx, cy + w * 0.35, w * 0.32, PI * 1.2, PI * 1.8)
    else:
        ctx.arc(cx, cy - w * 0.25, w * 0.42, PI * 0.2, PI * 0.8)
    ctx.stroke()


def cheeks(ctx, cx, cy, gap, r):
    for side in (-1, 1):
        ellipse(ctx, cx + side * gap, cy, r, r * 0.65)
        src(ctx, "#FF7F8E", 0.45)
        ctx.fill()


def tear(ctx, x, y, t):
    yy = y + (t * 60) % 50
    ctx.move_to(x, yy - 14)
    ctx.curve_to(x + 10, yy, x + 8, yy + 10, x, yy + 10)
    ctx.curve_to(x - 8, yy + 10, x - 10, yy, x, yy - 14)
    src(ctx, "#6EC6FF", 0.9)
    ctx.fill()


def heart(ctx, x, y, s, col="#FF4F7B", a=1.0):
    ctx.move_to(x, y + s * 0.35)
    ctx.curve_to(x - s, y - s * 0.3, x - s * 0.45, y - s, x, y - s * 0.45)
    ctx.curve_to(x + s * 0.45, y - s, x + s, y - s * 0.3, x, y + s * 0.35)
    src(ctx, col, a)
    ctx.fill_preserve()
    src(ctx, "#B0173F", a)
    ctx.set_line_width(s * 0.12)
    ctx.stroke()


# ---------- kids ----------

def _kid_limbs(ctx, st, sleeve, line, skin, legs_col, shoe):
    ph = st.get("phase", 0.0)
    swing = math.sin(ph) * (0.45 if st.get("walking") else 0.0)
    wave = st.get("wave", 0.0)
    # legs (short, peeking under the long dress)
    for side, sw in ((-1, swing), (1, -swing)):
        lx = side * 30 + sw * 18
        capsule(ctx, side * 30, -40, lx, -10, 26, legs_col, line)
        ellipse(ctx, lx + side * 6, -6, 26, 13)
        paint(ctx, shoe, line, 4)
    return swing, wave


def _kid_arms(ctx, st, swing, sleeve, line, skin, wave):
    for side, sw in ((-1, -swing), (1, swing)):
        sx, sy = side * 62, -205
        if wave and side == 1:
            hx, hy = sx + 70, sy - 70 + math.sin(st["t"] * 14) * 14
        else:
            hx, hy = sx + side * 22 + sw * 45, sy + 105
        capsule(ctx, sx, sy, hx, hy, 34, sleeve, line)
        ellipse(ctx, hx, hy + 6, 19, 19)
        paint(ctx, skin, line, 4)


def _kid_face(ctx, st, skin, line, hy, r):
    ellipse(ctx, 0, hy, r * 0.88, r * 0.95)
    paint(ctx, skin, line, 5)
    eyes(ctx, 0, hy - r * 0.05, r * 0.36, r * 0.22, st, lashes=st.get("girl", False))
    cheeks(ctx, 0, hy + r * 0.32, r * 0.55, r * 0.17)
    mouth(ctx, 0, hy + r * 0.5, r * 0.42, st)
    if st.get("emote") == "sad":
        tear(ctx, r * 0.42, hy + r * 0.25, st["t"])


def hamdan(ctx, st):
    line, skin = "#3A2618", "#C98E5E"
    white, shade = "#FBFBF7", "#D9DDE3"
    swing, wave = _kid_limbs(ctx, st, white, line, skin, skin, "#7A4A26")
    # ghutra back drape
    ctx.move_to(-95, -330)
    ctx.curve_to(-120, -250, -112, -195, -88, -165)
    ctx.line_to(88, -165)
    ctx.curve_to(112, -195, 120, -250, 95, -330)
    ctx.close_path()
    paint(ctx, shade, line, 5)
    # kandura
    ctx.move_to(-62, -225)
    ctx.curve_to(-80, -150, -88, -80, -84, -32)
    ctx.curve_to(-30, -22, 30, -22, 84, -32)
    ctx.curve_to(88, -80, 80, -150, 62, -225)
    ctx.close_path()
    paint(ctx, white, line, 5)
    # placket + tarboosha tassel
    src(ctx, shade)
    ctx.set_line_width(4)
    ctx.move_to(0, -222)
    ctx.line_to(0, -150)
    ctx.stroke()
    sway = math.sin(st.get("phase", 0) * 2 + st["t"] * 3) * 6
    ctx.move_to(4, -215)
    ctx.curve_to(10, -190, 8 + sway, -160, 8 + sway, -135)
    src(ctx, "#E9E2D3")
    ctx.set_line_width(5)
    ctx.stroke()
    ellipse(ctx, 8 + sway, -125, 8, 14)
    paint(ctx, "#F2EBDC", line, 3)
    _kid_arms(ctx, st, swing, white, line, skin, wave)
    # head + ghutra
    hy, r = -300, 82
    ctx.move_to(-r - 18, -228)
    ctx.curve_to(-r - 30, -330, -r + 10, -398, 0, -400)
    ctx.curve_to(r - 10, -398, r + 30, -330, r + 18, -228)
    ctx.curve_to(r - 10, -240, -r + 10, -240, -r - 18, -228)
    ctx.close_path()
    paint(ctx, white, line, 5)
    _kid_face(ctx, st, skin, line, hy, r * 0.88)
    # front edge of ghutra framing the face
    ctx.move_to(-r * 0.82, -250)
    ctx.curve_to(-r * 0.95, -330, -r * 0.5, -372, 0, -374)
    ctx.curve_to(r * 0.5, -372, r * 0.95, -330, r * 0.82, -250)
    src(ctx, shade)
    ctx.set_line_width(9)
    ctx.stroke()
    # agal: two black rings seen from the front
    for dy in (0, 15):
        ellipse(ctx, 0, -372 + dy, r * 0.98, 13)
        src(ctx, "#151515")
        ctx.set_line_width(9)
        ctx.stroke()


def maitha(ctx, st):
    st = dict(st, girl=True)
    line, skin = "#3A2618", "#B97A4F"
    dress, gold, scarf = "#FF4FA0", "#FFC93C", "#9B6BFF"
    swing, wave = _kid_limbs(ctx, st, dress, line, skin, gold, "#C2185B")
    # mukhawar dress
    ctx.move_to(-60, -225)
    ctx.curve_to(-85, -150, -100, -80, -98, -34)
    ctx.curve_to(-30, -22, 30, -22, 98, -34)
    ctx.curve_to(100, -80, 85, -150, 60, -225)
    ctx.close_path()
    paint(ctx, dress, line, 5)
    # gold embroidery: centre band and hem
    rrect(ctx, -16, -222, 32, 150, 10)
    paint(ctx, gold, line, 3)
    for y in range(-210, -80, 22):
        ellipse(ctx, 0, y, 7, 7)
        src(ctx, "#FF8A00")
        ctx.fill()
    ctx.move_to(-96, -52)
    ctx.curve_to(-30, -42, 30, -42, 96, -52)
    src(ctx, gold)
    ctx.set_line_width(14)
    ctx.stroke()
    _kid_arms(ctx, st, swing, dress, line, skin, wave)
    for side in (-1, 1):  # sleeve cuffs
        pass
    hy, r = -300, 82
    # shayla (scarf) hood
    ctx.move_to(-r - 22, -215)
    ctx.curve_to(-r - 40, -330, -r + 5, -402, 0, -404)
    ctx.curve_to(r - 5, -402, r + 40, -330, r + 22, -215)
    ctx.curve_to(r, -232, -r, -232, -r - 22, -215)
    ctx.close_path()
    paint(ctx, scarf, line, 5)
    # fringe of hair
    _kid_face(ctx, st, skin, line, hy, r * 0.88)
    ctx.move_to(-r * 0.78, -322)
    ctx.curve_to(-r * 0.6, -372, r * 0.6, -372, r * 0.78, -322)
    ctx.curve_to(r * 0.3, -350, -r * 0.3, -350, -r * 0.78, -322)
    paint(ctx, "#2B1A12")
    # scarf edge with sequins
    ctx.move_to(-r * 0.86, -240)
    ctx.curve_to(-r * 1.0, -335, -r * 0.5, -382, 0, -384)
    ctx.curve_to(r * 0.5, -382, r * 1.0, -335, r * 0.86, -240)
    src(ctx, "#C9A7FF")
    ctx.set_line_width(10)
    ctx.stroke()
    for k in range(9):
        a = PI * (0.12 + 0.76 * k / 8)
        ellipse(ctx, -math.cos(a) * r * 0.97, -310 - math.sin(a) * r * 0.85, 5, 5)
        src(ctx, gold)
        ctx.fill()


def yadda(ctx, st):
    line, skin = "#24170F", "#B67B52"
    abaya, gold = "#1E1B24", "#E8B93A"
    st = dict(st)
    # abaya
    ctx.move_to(-70, -235)
    ctx.curve_to(-110, -150, -125, -70, -120, -6)
    ctx.curve_to(-40, 4, 40, 4, 120, -6)
    ctx.curve_to(125, -70, 110, -150, 70, -235)
    ctx.close_path()
    paint(ctx, abaya, "#000000", 5)
    # golden trim
    ctx.move_to(-118, -14)
    ctx.curve_to(-40, -4, 40, -4, 118, -14)
    src(ctx, gold)
    ctx.set_line_width(8)
    ctx.stroke()
    for side in (-1, 1):
        sw = math.sin(st["t"] * 1.5 + side) * 4
        capsule(ctx, side * 70, -215, side * 92 + sw, -120, 38, abaya, "#000000")
        ellipse(ctx, side * 92 + sw, -110, 20, 20)
        paint(ctx, skin, line, 4)
        ellipse(ctx, side * 92 + sw, -128, 22, 7)
        src(ctx, gold)
        ctx.set_line_width(5)
        ctx.stroke()
    hy, r = -305, 80
    ctx.move_to(-r - 25, -215)
    ctx.curve_to(-r - 40, -335, -r + 5, -405, 0, -407)
    ctx.curve_to(r - 5, -405, r + 40, -335, r + 25, -215)
    ctx.curve_to(r, -235, -r, -235, -r - 25, -215)
    ctx.close_path()
    paint(ctx, abaya, "#000000", 5)
    ellipse(ctx, 0, hy, r * 0.8, r * 0.88)
    paint(ctx, skin, line, 5)
    cheeks(ctx, 0, hy + r * 0.32, r * 0.5, r * 0.15)
    # burqa (البرقع): golden mask over brow and nose
    ctx.move_to(-r * 0.78, hy - r * 0.42)
    ctx.curve_to(-r * 0.4, hy - r * 0.62, r * 0.4, hy - r * 0.62, r * 0.78, hy - r * 0.42)
    ctx.line_to(r * 0.74, hy - r * 0.25)
    ctx.curve_to(r * 0.4, hy - r * 0.36, r * 0.15, hy - r * 0.32, r * 0.1, hy - r * 0.2)
    ctx.line_to(r * 0.1, hy + r * 0.3)
    ctx.curve_to(r * 0.1, hy + r * 0.38, -r * 0.1, hy + r * 0.38, -r * 0.1, hy + r * 0.3)
    ctx.line_to(-r * 0.1, hy - r * 0.2)
    ctx.curve_to(-r * 0.15, hy - r * 0.32, -r * 0.4, hy - r * 0.36, -r * 0.74, hy - r * 0.25)
    ctx.close_path()
    paint(ctx, gold, "#8C6512", 4)
    eyes(ctx, 0, hy - r * 0.05, r * 0.38, r * 0.17, dict(st, emote="love" if st.get("emote") == "love" else st.get("emote", "happy")))
    mouth(ctx, 0, hy + r * 0.55, r * 0.38, st)


# ---------- animals (side view, facing right) ----------

def camel(ctx, st, body="#EFC98E", dark="#B9874E", line="#5A3A1E", mom=False):
    ph = st.get("phase", 0.0)
    walking = st.get("walking")
    # legs
    for i, (lx, off) in enumerate(((-75, 0), (-50, PI), (60, PI), (85, 0))):
        sw = math.sin(ph + off) * 22 if walking else 0
        col = dark if i in (0, 2) else body
        capsule(ctx, lx, -170, lx + sw * 0.5, -95, 20, col, line)
        capsule(ctx, lx + sw * 0.5, -95, lx + sw, -12, 17, col, line)
        ellipse(ctx, lx + sw, -95, 13, 12)
        paint(ctx, col, line, 4)
        ellipse(ctx, lx + sw + 4, -8, 20, 10)
        paint(ctx, dark, line, 4)
    # tail
    ctx.move_to(-122, -200)
    ctx.curve_to(-145, -175, -140, -150, -150, -130 + math.sin(st["t"] * 4) * 6)
    src(ctx, line)
    ctx.set_line_width(8)
    ctx.stroke()
    # body + hump as one outlined shape
    ctx.move_to(-125, -195)
    ctx.curve_to(-125, -240, -100, -252, -72, -250)
    ctx.curve_to(-55, -335, 45, -335, 62, -250)
    ctx.curve_to(95, -255, 125, -232, 125, -195)
    ctx.curve_to(125, -142, 60, -128, 0, -128)
    ctx.curve_to(-60, -128, -125, -142, -125, -195)
    ctx.close_path()
    paint(ctx, body, line, 5)
    if mom:
        # woven saddle blanket with Emirati sadu stripes
        ctx.move_to(-70, -250)
        ctx.curve_to(-50, -300, 40, -300, 55, -250)
        ctx.line_to(60, -180)
        ctx.line_to(-75, -180)
        ctx.close_path()
        paint(ctx, "#C62828", line, 4)
        for k, c in enumerate(("#FFFFFF", "#1B5E20", "#FFC93C")):
            y = -235 + k * 18
            ctx.move_to(-68, y)
            ctx.line_to(57, y)
            src(ctx, c)
            ctx.set_line_width(6)
            ctx.set_dash([12, 8])
            ctx.stroke()
            ctx.set_dash([])
    # neck
    bob = math.sin(ph * 2) * 4 if walking else math.sin(st["t"] * 2) * 3
    ctx.move_to(85, -230)
    ctx.curve_to(150, -250, 140, -330, 165, -360 + bob)
    ctx.line_to(205, -350 + bob)
    ctx.curve_to(190, -300, 205, -230, 115, -165)
    ctx.close_path()
    paint(ctx, body, line, 5)
    if mom:
        for k in range(7):
            ellipse(ctx, 150 + k * 7, -255 + k * 12, 9, 9)
            paint(ctx, ("#FF4F7B", "#FFC93C", "#29B6F6")[k % 3], line, 2)
        ctx.move_to(185, -175)
        ctx.line_to(190, -140)
        src(ctx, "#C62828")
        ctx.set_line_width(10)
        ctx.stroke()
    # head
    hx, hy = 195, -368 + bob
    ellipse(ctx, hx, hy, 60, 42, -0.1)
    paint(ctx, body, line, 5)
    ellipse(ctx, hx + 48, hy + 12, 32, 28, -0.1)
    paint(ctx, "#F6DDB0", line, 5)
    ellipse(ctx, hx + 66, hy + 4, 5, 3)
    src(ctx, line)
    ctx.fill()
    # ear
    ellipse(ctx, hx - 38, hy - 34, 12, 20, -0.5)
    paint(ctx, dark, line, 4)
    # eye (side view: one big eye)
    one = dict(st)
    ctx.save()
    eyes(ctx, hx + 4, hy - 8, 0, 18, one, lashes=True)
    ctx.restore()
    # mouth on snout
    m = st.get("mouth", 0.0)
    if m > 0.08:
        ellipse(ctx, hx + 60, hy + 26, 14, 4 + 12 * m)
        paint(ctx, "#6B1F24", line, 3)
    else:
        src(ctx, line)
        ctx.set_line_width(4)
        if st.get("emote") == "sad":
            ctx.arc(hx + 60, hy + 40, 12, PI * 1.2, PI * 1.8)
        else:
            ctx.arc(hx + 56, hy + 18, 14, PI * 0.2, PI * 0.8)
        ctx.stroke()
    ellipse(ctx, hx + 22, hy + 14, 10, 6)
    src(ctx, "#FF7F8E", 0.5)
    ctx.fill()
    if st.get("emote") == "sad":
        tear(ctx, hx + 20, hy + 12, st["t"])


def zafran(ctx, st):
    camel(ctx, st)


def mom(ctx, st):
    camel(ctx, st, body="#D8A866", dark="#A8743F", mom=True)


def falcon(ctx, st):
    line = "#2B1E14"
    t = st["t"]
    flying = st.get("flying")
    flap = math.sin(t * 16) if flying else 0
    # back wing
    if flying:
        ctx.move_to(-10, -40)
        ctx.curve_to(-60, -110 - flap * 60, -150, -120 - flap * 70, -200, -90 - flap * 90)
        ctx.curve_to(-140, -60, -80, -30, -10, -20)
        paint(ctx, "#6D5A4B", line, 4)
    # tail
    ctx.move_to(-60, -30)
    ctx.line_to(-130, 0)
    ctx.line_to(-120, 20)
    ctx.line_to(-50, 0)
    ctx.close_path()
    paint(ctx, "#7B6553", line, 4)
    ellipse(ctx, 0, -30, 80, 48, -0.25)
    paint(ctx, "#8A7464", line, 5)
    ellipse(ctx, 25, -20, 42, 32, -0.2)
    paint(ctx, "#F3E6CF")
    for k in range(6):
        ellipse(ctx, 10 + (k % 3) * 16, -28 + (k // 3) * 16, 4, 6)
        src(ctx, "#8A7464")
        ctx.fill()
    if not flying:
        ellipse(ctx, -15, -40, 60, 30, -0.3)
        paint(ctx, "#6D5A4B", line, 4)
        for side in (-1, 1):
            capsule(ctx, 10 + side * 10, 10, 12 + side * 10, 30, 8, "#F2B705", line)
    # head
    ellipse(ctx, 70, -80, 42, 38)
    paint(ctx, "#8A7464", line, 5)
    ellipse(ctx, 82, -66, 26, 22)
    paint(ctx, "#F3E6CF")
    # malar stripe
    ctx.move_to(78, -86)
    ctx.curve_to(70, -70, 72, -60, 66, -50)
    src(ctx, "#3A2B20")
    ctx.set_line_width(9)
    ctx.stroke()
    eyes(ctx, 82, -92, 0, 13, dict(st, emote=st.get("emote", "happy")), iris="#3A2314")
    # beak
    m = st.get("mouth", 0.0)
    ctx.move_to(104, -88)
    ctx.curve_to(132, -88, 140, -72, 128, -60)
    ctx.line_to(110, -72)
    ctx.close_path()
    paint(ctx, "#F2B705", line, 4)
    ctx.move_to(108, -70 + m * 4)
    ctx.line_to(124, -58 + m * 12)
    ctx.line_to(104, -60 + m * 8)
    ctx.close_path()
    paint(ctx, "#E09B00", line, 3)
    # front wing
    if flying:
        ctx.move_to(10, -50)
        ctx.curve_to(-20, -140 - flap * 60, -100, -170 - flap * 80, -150, -150 - flap * 100)
        ctx.curve_to(-90, -90, -40, -50, 10, -25)
        paint(ctx, "#9C8574", line, 4)


def oryx(ctx, st):
    line = "#3A2C24"
    white, brown, dark = "#FBF8F1", "#7A5134", "#2D221C"
    ph = st.get("phase", 0.0)
    walking = st.get("walking")
    for i, (lx, off) in enumerate(((-70, 0), (-50, PI), (60, PI), (80, 0))):
        sw = math.sin(ph + off) * 20 if walking else 0
        capsule(ctx, lx, -150, lx + sw * 0.4, -80, 18, white, line)
        capsule(ctx, lx + sw * 0.4, -80, lx + sw, -8, 13, brown, line)
        ellipse(ctx, lx + sw + 3, -6, 11, 7)
        paint(ctx, dark)
    ctx.move_to(-108, -180)
    ctx.curve_to(-130, -150, -125, -120, -135, -95)
    src(ctx, dark)
    ctx.set_line_width(9)
    ctx.stroke()
    ellipse(ctx, 0, -175, 115, 55)
    paint(ctx, white, line, 5)
    # neck + head
    ctx.move_to(70, -205)
    ctx.curve_to(110, -240, 120, -280, 130, -300)
    ctx.line_to(165, -285)
    ctx.curve_to(150, -250, 140, -200, 100, -150)
    ctx.close_path()
    paint(ctx, white, line, 5)
    hx, hy = 155, -300
    # horns: long and straight, swept back
    for k, dx in enumerate((0, 14)):
        ctx.move_to(hx - 18 + dx, hy - 30)
        ctx.line_to(hx - 175 + dx, hy - 165)
        src(ctx, "#2A221D")
        ctx.set_line_width(10 - k * 2)
        ctx.set_line_cap(1)
        ctx.stroke()
    ellipse(ctx, hx, hy, 46, 34, 0.25)
    paint(ctx, white, line, 5)
    ellipse(ctx, hx + 30, hy + 20, 24, 18, 0.3)
    paint(ctx, white, line, 4)
    # face mask markings
    ctx.move_to(hx - 20, hy - 25)
    ctx.curve_to(hx + 10, hy - 10, hx + 30, hy + 5, hx + 45, hy + 30)
    src(ctx, dark)
    ctx.set_line_width(12)
    ctx.stroke()
    ellipse(ctx, hx - 30, hy - 22, 10, 22, -0.6)
    paint(ctx, white, line, 3)
    eyes(ctx, hx + 2, hy - 12, 0, 12, st, lashes=True)
    m = st.get("mouth", 0.0)
    if m > 0.08:
        ellipse(ctx, hx + 44, hy + 32, 10, 3 + 8 * m, 0.3)
        paint(ctx, "#6B1F24", line, 3)


def hare(ctx, st):
    line = "#4A3324"
    fur, light = "#C9A27A", "#F1E2CC"
    t = st["t"]
    twitch = math.sin(t * 6) * 0.08
    for k, (ex, rot) in enumerate(((-12, -0.18 + twitch), (18, 0.12 - twitch))):
        ellipse(ctx, ex, -240, 20, 75, rot)
        paint(ctx, fur, line, 4)
        ellipse(ctx, ex, -235, 9, 55, rot)
        src(ctx, "#F6A6B2")
        ctx.fill()
    ellipse(ctx, -55, -55, 22, 20)
    paint(ctx, "#FFFFFF", line, 3)
    ellipse(ctx, -10, -75, 70, 72)
    paint(ctx, fur, line, 5)
    ellipse(ctx, 12, -60, 38, 45)
    paint(ctx, light)
    for side in (-1, 1):
        ellipse(ctx, side * 30, -8, 26, 12)
        paint(ctx, fur, line, 4)
    ellipse(ctx, 25, -160, 55, 48)
    paint(ctx, fur, line, 5)
    ellipse(ctx, 40, -140, 30, 22)
    paint(ctx, light)
    eyes(ctx, 25, -172, 22, 13, st)
    ellipse(ctx, 42, -146, 8, 6)
    src(ctx, "#F06A80")
    ctx.fill()
    src(ctx, line)
    ctx.set_line_width(2)
    for side in (-1, 1):
        for k in (-1, 0, 1):
            ctx.move_to(42 + side * 12, -142 + k * 5)
            ctx.line_to(42 + side * 50, -146 + k * 10)
            ctx.stroke()
    mouth(ctx, 40, -128, 26, st, tongue=False)


CAST = {"hamdan": hamdan, "maitha": maitha, "yadda": yadda, "zafran": zafran, "mom": mom,
        "falcon": falcon, "oryx": oryx, "hare": hare}
SIDE_VIEW = {"zafran", "mom", "falcon", "oryx", "hare"}
# drawing size multiplier so every character reads well at scale 1
SIZE = {"hamdan": 1.0, "maitha": 1.0, "yadda": 1.05, "zafran": 0.95, "mom": 1.2, "falcon": 0.9,
        "oryx": 1.0, "hare": 0.9}
