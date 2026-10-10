"""Score + SFX for the Eat Out Better brag video. 120 BPM, C major, 20 s, 48 kHz stereo.
Every hit is placed on the same timestamps the video's render(t) uses."""
import numpy as np, wave, os

SR = 48000
DUR = 20.0
N = int(SR * DUR)
rng = np.random.default_rng(7)
BEAT = 0.5

def t_(d): return np.arange(int(SR * d)) / SR
def midi(m): return 440.0 * 2 ** ((m - 69) / 12)

def fft_filter(x, lo=None, hi=None, slope=2.0):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); g = np.ones_like(f)
    if hi: g *= 1 / np.sqrt(1 + (f / hi) ** (2 * slope))
    if lo: g *= 1 / np.sqrt(1 + (lo / np.maximum(f, 1e-3)) ** (2 * slope))
    return np.fft.irfft(X * g, len(x))

def saw(f, d, nh=None, detune=0.0):
    t = t_(d); out = np.zeros_like(t)
    for fr in ([f] if not detune else [f * (1 - detune), f, f * (1 + detune)]):
        k = 1
        while k * fr < 7000 and (nh is None or k <= nh):
            out += np.sin(2 * np.pi * k * fr * t + rng.uniform(0, 6.28)) / k; k += 1
    return out / (3 if detune else 1)

def env(d, a=0.003, dec=0.3, sus=0.0, rel=None):
    t = t_(d); e = np.minimum(1, t / a) * (sus + (1 - sus) * np.exp(-t / dec))
    if rel: e *= np.clip((d - t) / rel, 0, 1)
    return e

L = np.zeros(N); R = np.zeros(N)       # music bus
SL = np.zeros(N); SRr = np.zeros(N)    # sfx bus
DUCKED_L = np.zeros(N); DUCKED_R = np.zeros(N)  # music elements that get sidechained

def place(buf_l, buf_r, x, at, gain=1.0, pan=0.0):
    i = int(at * SR);
    if i >= N: return
    x = x[: N - i]
    gl = gain * np.sqrt(0.5 * (1 - pan)); gr = gain * np.sqrt(0.5 * (1 + pan))
    buf_l[i:i + len(x)] += x * gl; buf_r[i:i + len(x)] += x * gr

# ---------------- one-shots ----------------
def kick(big=False):
    d = 0.5; t = t_(d)
    f = 45 + 120 * np.exp(-t / 0.035)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * np.exp(-t / (0.32 if big else 0.22))
    x += 0.25 * fft_filter(rng.standard_normal(len(t)), lo=2000) * np.exp(-t / 0.004)
    return np.tanh(x * 1.6) * 0.9

def clap():
    d = 0.35; t = t_(d); n = rng.standard_normal(len(t)); e = np.zeros_like(t)
    for o in (0, 0.011, 0.022):
        e += (t >= o) * np.exp(-(t - o).clip(0) / 0.006)
    e += (t >= 0.03) * 0.5 * np.exp(-(t - 0.03).clip(0) / 0.09)
    return fft_filter(n, lo=900, hi=4200) * e * 0.9

def hat(open_=False):
    d = 0.25 if open_ else 0.08; t = t_(d)
    return fft_filter(rng.standard_normal(len(t)), lo=7000, slope=3) * np.exp(-t / (0.07 if open_ else 0.018)) * 0.5

def pluck_chord(notes, d=0.45, bright=1.0):
    x = sum(saw(midi(m), d, detune=0.004) for m in notes) / len(notes)
    t = t_(d)
    # brightness envelope via two-band mix
    lo = fft_filter(x, hi=900); hi_ = x - lo
    y = lo + hi_ * bright * np.exp(-t / 0.08)
    return y * env(d, 0.004, 0.22, 0.12, rel=0.06)

def bass_note(m, d):
    x = saw(midi(m), d, nh=12); x = fft_filter(x, hi=650)
    x += 0.6 * np.sin(2 * np.pi * midi(m) * t_(d))
    return np.tanh(1.4 * x) * env(d, 0.004, 0.25, 0.55, rel=0.03) * 0.55

def bell(m, d=1.2, idx=2.2):
    t = t_(d); fc = midi(m)
    x = np.sin(2 * np.pi * fc * t + idx * np.exp(-t / 0.25) * np.sin(2 * np.pi * fc * 3.5 * t))
    return x * env(d, 0.002, 0.35) * 0.5

def marimba(m, d=0.6):
    t = t_(d); f = midi(m)
    x = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * f * 4 * t) * np.exp(-t / 0.03)
    return x * env(d, 0.002, 0.16) * 0.6

def tock(m=88):
    t = t_(0.12); f = midi(m)
    return (np.sin(2 * np.pi * f * t) * np.exp(-t / 0.025) + 0.3 * fft_filter(rng.standard_normal(len(t)), lo=3000) * np.exp(-t / 0.003)) * 0.5

def whoosh(d, rising=True, lo=300, hi=6000):
    n = rng.standard_normal(int(SR * d)); hop = 1024; win = np.hanning(2048); out = np.zeros(len(n) + 2048)
    steps = range(0, len(n) - 2048, hop)
    for k, i in enumerate(steps):
        p = k / max(1, len(steps) - 1); p = p if rising else 1 - p
        fc = lo * (hi / lo) ** p
        seg = fft_filter(n[i:i + 2048] * win, lo=fc * 0.5, hi=fc * 1.6)
        out[i:i + 2048] += seg
    out = out[: len(n)]
    t = t_(d); shape = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 1.5
    if rising: shape = (t / d) ** 2.2
    return out * shape / (np.abs(out).max() + 1e-9)

def impact():
    d = 2.6; t = t_(d)
    f = 38 + 70 * np.exp(-t / 0.08)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.55)
    x += 0.35 * fft_filter(rng.standard_normal(len(t)), hi=1800) * np.exp(-t / 0.25)
    return np.tanh(1.3 * x) * 0.9

def reverb_ir(d=1.6, decay=0.45):
    t = t_(d)
    irl = rng.standard_normal(len(t)) * np.exp(-t / decay); irr = rng.standard_normal(len(t)) * np.exp(-t / decay)
    irl = fft_filter(irl, hi=6000); irr = fft_filter(irr, hi=6000)
    irl[:int(.012 * SR)] *= np.linspace(0, 1, int(.012 * SR)); irr[:int(.017 * SR)] *= np.linspace(0, 1, int(.017 * SR))
    return irl / np.sqrt((irl ** 2).sum()), irr / np.sqrt((irr ** 2).sum())

def conv(x, ir):
    n = len(x) + len(ir); nf = 1 << (n - 1).bit_length()
    return np.fft.irfft(np.fft.rfft(x, nf) * np.fft.rfft(ir, nf), nf)[: len(x)]

K, KB, CL, HC, HO = kick(), kick(True), clap(), hat(), hat(True)

# chords: C  G  Am  F   (voiced around middle C)
CH = {"C": [60, 64, 67, 72], "G": [59, 62, 67, 71], "Am": [57, 60, 64, 69], "F": [57, 60, 65, 69], "Dm": [57, 62, 65, 69]}
ROOT = {"C": 36, "G": 43, "Am": 45, "F": 41, "Dm": 38}

# ---------------- HOOK 0-4 ----------------
hook_hits = [(0.0, "Am"), (0.5, "F"), (1.0, "C"), (1.5, "G")]
for at, c in hook_hits:
    place(L, R, pluck_chord(CH[c] + [CH[c][0] - 12], 0.5, 1.3) * 0.8, at)
    place(L, R, K * 0.75, at)
    place(L, R, bass_note(ROOT[c], 0.45) * 0.7, at)
    place(SL, SRr, tock(84) * 0.25, at, pan=(-0.4 if int(at * 2) % 2 == 0 else 0.4))
# soft pad under the hook
pad = np.zeros(int(SR * 4.0)); tp = t_(4.0)
for m in [57, 64, 69, 72]:
    pad += np.sin(2 * np.pi * midi(m) * tp) + 0.3 * np.sin(2 * np.pi * midi(m) * 2.001 * tp)
pad *= np.clip(tp / 0.8, 0, 1) * np.clip((3.95 - tp) / 0.3, 0, 1) * 0.04
place(L, R, pad, 0.0, pan=-0.2); place(L, R, pad, 0.0, pan=0.2)
# "Have high cholesterol?" slam at 2.0
place(L, R, impact() * 0.75, 2.0)
place(L, R, pluck_chord([53, 57, 60, 65, 69], 1.2, 1.4) * 0.6, 2.0)
place(L, R, KB * 0.8, 2.0)
# build: riser + accelerating snare/clap roll, gap before drop
place(L, R, whoosh(1.55, True, 250, 9000) * 0.28, 2.35)
roll = [3.0, 3.25, 3.5, 3.625, 3.75, 3.8125, 3.875]
for i, at in enumerate(roll):
    place(L, R, CL * (0.25 + 0.06 * i), at, pan=(-0.15 if i % 2 else 0.15))
for i, at in enumerate(np.arange(2.5, 3.9, 0.125)):
    place(L, R, HC * 0.25 * (0.4 + (at - 2.5) / 1.4), at, pan=0.3)

# ---------------- GROOVE 4-17 ----------------
prog = ["C", "G", "Am", "F", "C", "G", "Am"]   # bars at 4,6,8,...,16
pluck_rhythm = [0, 0.75, 1.5, 2.0, 2.75, 3.5]   # in beats, within a 4-beat bar (syncopated)
kick_times = []
for b, c in enumerate(prog):
    bar = 4.0 + b * 2.0
    for beat in range(4):
        at = bar + beat * BEAT
        kick_times.append(at)
        place(L, R, (KB if (b == 0 and beat == 0) else K) * 0.85, at)
        if beat in (1, 3): place(L, R, CL * 0.45, at)
        place(L, R, HC * 0.33, at + 0.25, pan=0.35)
        place(L, R, HC * 0.12, at + 0.125, pan=-0.3)
        place(L, R, HC * 0.12, at + 0.375, pan=-0.3)
    if b % 2 == 1: place(L, R, HO * 0.25, bar + 3.5 * BEAT, pan=0.3)
    # bass: driving 8ths, octave bounce on offbeats
    for i in range(8):
        at = bar + i * 0.25
        m = ROOT[c] + (12 if i % 2 else 0)
        place(DUCKED_L, DUCKED_R, bass_note(m, 0.24), at)
    for r in pluck_rhythm:
        place(DUCKED_L, DUCKED_R, pluck_chord(CH[c], 0.4, 1.0) * 0.32, bar + r * BEAT, pan=-0.25)
        place(DUCKED_L, DUCKED_R, pluck_chord([n + 12 for n in CH[c][1:]], 0.3, 0.8) * 0.12, bar + r * BEAT + 0.01, pan=0.3)
# crash-ish swell at the drop
place(L, R, fft_filter(rng.standard_normal(int(SR * 1.8)), lo=4000) * np.exp(-t_(1.8) / 0.5) * 0.18, 4.0)
place(L, R, whoosh(0.6, False, 6000, 400) * 0.18, 4.0)   # phone rising
# arpeggio lead during the results (bars at 12,14 -> 'C','G') — sparkle, quiet
arp = {"C": [72, 76, 79, 84], "G": [71, 74, 79, 83], "Am": [69, 72, 76, 81], "F": [69, 72, 77, 81]}
for b in (4, 5):
    bar = 4.0 + b * 2.0; c = prog[b]
    for i in range(16):
        m = arp[c][i % 4] + (12 if (i // 4) % 2 else 0)
        place(DUCKED_L, DUCKED_R, bell(m, 0.35, 1.2) * 0.09, bar + i * 0.125, pan=(-0.5 + (i % 4) / 3))
# fill into the outro: drop kick on last beat of bar at 16
place(L, R, whoosh(0.5, True, 400, 8000) * 0.22, 16.5)

# ---------------- OUTRO 17-20 ----------------
place(L, R, impact() * 0.6, 17.0)
place(L, R, KB * 0.9, 17.0)
place(L, R, pluck_chord([48, 55, 60, 64, 67, 72, 76], 2.8, 1.5) * 0.55, 17.0)
place(L, R, fft_filter(rng.standard_normal(int(SR * 2.5)), lo=4500) * np.exp(-t_(2.5) / 0.7) * 0.2, 17.0)
for beat in range(4):   # lighter groove, bar 17-19
    at = 17.0 + beat * BEAT
    if beat: place(L, R, K * 0.7, at)
    if beat in (1, 3): place(L, R, CL * 0.35, at)
    place(L, R, HC * 0.25, at + 0.25, pan=0.35)
for i, m in enumerate([76, 79, 84, 88, 91, 96]):
    place(L, R, bell(m, 1.0, 1.6) * 0.12, 17.22 + i * 0.06, pan=(-0.6 + i * 0.24))
# final button on 19.0
place(L, R, KB * 0.9, 19.0)
place(L, R, pluck_chord([48, 52, 55, 60, 64, 67, 72], 1.0, 1.2) * 0.5, 19.0)
place(L, R, bass_note(36, 0.9) * 0.9, 19.0)
place(L, R, bell(84, 1.0, 1.0) * 0.15, 19.0)

# ---------------- SFX (in key, under the music) ----------------
place(SL, SRr, sum([bell(m, 0.9, 1.4) for m in (84,)]) * 0.12, 4.12, pan=-0.5)          # logo confetti
for i, m in enumerate([79, 84, 88]): place(SL, SRr, bell(m, 0.6, 1.2) * 0.08, 4.14 + i * 0.05, pan=-0.6 + i * 0.2)
place(SL, SRr, tock(84), 6.38, pan=0.4)                         # tap: Scan a menu
place(SL, SRr, whoosh(0.38, False, 3000, 600) * 0.18, 6.65, pan=0.4)   # push
# shutter: two mechanical clicks + bright blip, then thumbnail pop
sh = fft_filter(rng.standard_normal(int(SR * .05)), lo=2500, hi=9000) * np.exp(-t_(.05) / .006)
place(SL, SRr, sh * 0.6, 8.05, pan=0.4); place(SL, SRr, sh * 0.45, 8.11, pan=0.4)
place(SL, SRr, bell(91, 0.5, 0.8) * 0.12, 8.06, pan=0.4)
tp_ = t_(0.18); pop = np.sin(2 * np.pi * np.cumsum(500 * np.exp(-tp_ / 0.06) + 260) / SR) * np.exp(-tp_ / 0.05) * 0.35
place(SL, SRr, pop, 8.2, pan=0.4)
place(SL, SRr, tock(86), 9.4, pan=0.4)                          # tap: Analyze
place(SL, SRr, whoosh(0.38, False, 3000, 600) * 0.18, 9.72, pan=0.4)
# processing: rising ticks up the C major scale, ding at 100%
scale = [72, 74, 76, 77, 79, 81, 83, 84, 86, 88, 89, 91]
for i, at in enumerate(np.linspace(10.0, 11.15, 12)):
    place(SL, SRr, marimba(scale[i], 0.25) * 0.10, at, pan=0.4)
place(SL, SRr, bell(84, 1.0, 1.0) * 0.14 + 0, 11.3, pan=0.4); place(SL, SRr, bell(91, 1.0, 1.0) * 0.08, 11.3, pan=0.4)
# result cards land
for i, m in enumerate([72, 76, 79, 84]): place(SL, SRr, marimba(m) * 0.20, 11.58 + i * 0.25, pan=0.4)
place(SL, SRr, whoosh(1.1, False, 4000, 500) * 0.12, 12.95, pan=0.4)  # scroll
place(SL, SRr, whoosh(0.4, False, 3000, 800) * 0.08, 14.35, pan=0.45)
place(SL, SRr, tock(88), 14.95, pan=0.45)                       # tap: Sides
for i, m in enumerate([79, 84, 88, 91, 96]): place(SL, SRr, marimba(m) * 0.16, 15.0 + i * 0.12, pan=0.45)
place(SL, SRr, whoosh(0.5, True, 500, 7000) * 0.14, 16.5)

# ---------------- mix ----------------
# sidechain the ducked bus from the groove kicks
duck = np.ones(N)
for at in kick_times + [17.0, 19.0]:
    i = int(at * SR); d = int(0.22 * SR); seg = 1 - 0.55 * np.exp(-np.arange(d) / (0.06 * SR))
    j = min(N, i + d); duck[i:j] = np.minimum(duck[i:j], seg[: j - i])
L += DUCKED_L * duck; R += DUCKED_R * duck

irl, irr = reverb_ir()
# one shared space for music and sfx so they sit together
wetL = conv(fft_filter(L, lo=250) * 0.5 + SL * 0.9, irl); wetR = conv(fft_filter(R, lo=250) * 0.5 + SRr * 0.9, irr)
mixL = L + SL * 0.85 + wetL * 0.22
mixR = R + SRr * 0.85 + wetR * 0.22
# gentle top-end tame, then glue + soft clip
mixL = fft_filter(mixL, hi=14000, slope=1); mixR = fft_filter(mixR, hi=14000, slope=1)
pk = max(np.abs(mixL).max(), np.abs(mixR).max())
mixL /= pk; mixR /= pk
mixL = np.tanh(mixL * 1.3) / np.tanh(1.3); mixR = np.tanh(mixR * 1.3) / np.tanh(1.3)
fade = np.clip((DUR - t_(DUR)) / 0.6, 0, 1); fadein = np.clip(t_(DUR) / 0.004, 0, 1)
mixL *= fade * fadein * 0.89; mixR *= fade * fadein * 0.89
out = np.stack([mixL, mixR], 1)
pcm = (np.clip(out, -1, 1) * 32767).astype(np.int16)
p = os.path.join(os.path.dirname(os.path.abspath(__file__)), "soundtrack.wav")
with wave.open(p, "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print("wrote", p)
