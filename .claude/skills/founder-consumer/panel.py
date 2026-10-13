#!/usr/bin/env python3
"""The buyer panel for founder-consumer. Standard library only, no network.

It does the bookkeeping for a swarm of simulated buyers: it deals one persona card
per buyer from your target-customer profile (income, age, behaviour, objection),
writes one brief per buyer for a sub-agent to answer, checks the answers, and
tallies who buys, who doesn't, and why.

    python3 panel.py init --customer founder/customer.json --pitch founder/pitch.md \
        [--price-pitch founder/pitch-no-price.md] [--n 100] [--seed 7]
    python3 panel.py prompts [--wave 10]     # one brief per buyer still to run, listed in waves
    python3 panel.py check                   # which answers are missing or broken
    python3 panel.py save P003 < reply.txt   # file a buyer's own JSON that it printed instead of writing
    python3 panel.py tally [--out founder/panel/results.md]
    python3 panel.py status

State lives in founder/panel/ (--dir to change it): panel.json, personas.json,
briefs/<id>.md, answers/<id>.json, results.md, results.json.

Price questions are a separate brief per buyer (briefs/<id>.price.md, answered in
answers/<id>.price.json), and only exist when init is given --price-pitch: the
pitch with every price taken out. A buyer who has just read "$39.99 a year"
answers the four price questions around $39.99, so asking them in the same brief
as the buy decision measures the founder's own price back. Run each price brief
in its own sub-agent, never the one that answered the buy brief.

The tool never answers for a buyer. Every number in results.md is counted from
the answer files the sub-agents wrote. Simulated buyers are a fast, cheap way to
find objections and weak spots. They are not customers: confirm what matters
with real ones (a pre-sale, a waitlist, a landing page with a price on it).
"""

import argparse
import json
import os
import random
import re
import sys

FIRST_NAMES = [
    "Maya", "Jordan", "Priya", "Marcus", "Sofia", "Ethan", "Aisha", "Liam", "Chloe", "Daniel", "Nadia", "Owen",
    "Grace", "Ravi", "Emma", "Kenji", "Zoe", "Luca", "Hana", "Noah", "Fatima", "Caleb", "Isla", "Mateo", "Leah",
    "Omar", "Ava", "Theo", "Mei", "Jonah", "Sara", "Diego", "Ruby", "Kofi", "Nora", "Felix", "Amara", "Ben", "Lina",
    "Sam", "Aria", "Julian", "Keisha", "Marco", "Ines", "Tariq", "Elena", "Hugo", "Yara", "Callum", "Rosa", "Idris",
    "Freya", "Andre", "Leila", "Mason", "Talia", "Rohan", "Esme", "Victor", "Anya", "Kai", "Beatriz", "Declan",
    "Sana", "Jasper", "Min", "Gabriel", "Olivia", "Arjun", "Clara", "Malik", "Iris", "Wes", "Noor", "Rafael", "Ivy",
    "Dev", "Maeve", "Tomas", "Celine", "Adrian", "Lucia", "Hamza", "Poppy", "Ezra", "Sienna", "Darius", "Quinn",
    "Selin", "Rhys", "Nia", "Oscar", "Tess", "Bilal", "Jade", "Luis", "Harper", "Emil", "Kira", "Pablo", "Alma",
    "Seth", "Zara", "Nico", "Farah", "Levi", "June", "Eli", "Ana", "Yusuf", "Lena", "Cole", "Mira", "Raj", "Elle",
    "Finn", "Dana", "Sol", "Ada",
]
REASONS = ["price", "habit", "need", "trust", "quality", "convenience", "timing", "values", "other"]
ANSWER_FIELDS = {"id", "buys", "reason_code", "reason"}
PRICE_FIELDS = ("price_too_cheap", "price_cheap", "price_expensive", "price_too_expensive")
PRICE_SUFFIX = ".price"
# A currency sign next to a number, or a number with a currency word after it.
PRICE_IN_TEXT = re.compile(r"[$€£¥]\s*\d|\d\s*(dollars?|usd|eur|euros?|pounds?|gbp)\b", re.I)
WAVE = 10


class PanelError(Exception):
    pass


# ── dealing ─────────────────────────────────────────────────────────────────────
def _quota(items, n, key="share"):
    """Split n across items by their shares, exactly (largest remainder)."""
    total = sum(float(it.get(key, 1)) for it in items) or 1.0
    raw = [n * float(it.get(key, 1)) / total for it in items]
    counts = [int(r) for r in raw]
    order = sorted(range(len(items)), key=lambda i: raw[i] - counts[i], reverse=True)
    for i in order[: n - sum(counts)]:
        counts[i] += 1
    return counts


def validate_customer(c):
    for k in ("business", "target", "segments", "behaviours", "objections"):
        if k not in c or c[k] in ("", [], None):
            raise PanelError("customer.json needs '%s'" % k)
    for s in c["segments"]:
        if "name" not in s or "income" not in s or len(s["income"]) != 2:
            raise PanelError("every segment needs a name and an income [low, high]")
    for b in c["behaviours"]:
        if "name" not in b:
            raise PanelError("every behaviour needs a name")


def deal(customer, n=100, seed=7):
    """Deal n persona cards. Same customer + n + seed = the same cards, every time."""
    validate_customer(customer)
    if n < 1:
        raise PanelError("--n must be at least 1")
    rng = random.Random(seed)
    age = customer.get("age", [25, 45])
    segs = []
    for s, k in zip(customer["segments"], _quota(customer["segments"], n)):
        segs += [s] * k
    behs = []
    for b, k in zip(customer["behaviours"], _quota(customer["behaviours"], n)):
        behs += [b] * k
    rng.shuffle(segs)
    rng.shuffle(behs)
    names = FIRST_NAMES[:]
    rng.shuffle(names)
    while len(names) < n:
        names += ["%s %d" % (x, len(names) // len(FIRST_NAMES) + 1) for x in FIRST_NAMES]
    objections = customer["objections"]
    habits = customer.get("habits") or []
    cards = []
    for i in range(n):
        s, b = segs[i], behs[i]
        lo, hi = float(s["income"][0]), float(s["income"][1])
        cards.append({
            "id": "P%03d" % (i + 1),
            "name": names[i],
            "age": rng.randint(int(age[0]), int(age[1])),
            "segment": s["name"],
            "income": int(round(rng.uniform(lo, hi), -3)),
            "behaviour": b["name"],
            "behaviour_how": b.get("how", ""),
            "objection": objections[rng.randrange(len(objections))],
            "habit": habits[rng.randrange(len(habits))] if habits else "",
        })
    return cards


# ── state ───────────────────────────────────────────────────────────────────────
def _path(d, *p):
    return os.path.join(d, *p)


def _read_json(path):
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def _write_json(path, obj):
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(obj, fh, indent=1, ensure_ascii=False)
        fh.write("\n")


def init(d, customer_path, pitch_path, n=100, seed=None, price_pitch_path=None):
    try:
        customer = _read_json(customer_path)
    except FileNotFoundError:
        raise PanelError("no such file: %s" % customer_path)
    try:
        with open(pitch_path, encoding="utf-8") as fh:
            pitch = fh.read().strip()
    except FileNotFoundError:
        raise PanelError("no such file: %s (write the pitch first: what you sell, the price, where)" % pitch_path)
    if not pitch:
        raise PanelError("the pitch is empty")
    price_pitch = None
    if price_pitch_path:
        try:
            with open(price_pitch_path, encoding="utf-8") as fh:
                price_pitch = fh.read().strip()
        except FileNotFoundError:
            raise PanelError("no such file: %s" % price_pitch_path)
        if not price_pitch:
            raise PanelError("the price pitch is empty")
        hit = PRICE_IN_TEXT.search(price_pitch)
        if hit:
            raise PanelError("the price pitch shows a price (%r): take every price out, or the price"
                             " answers will just echo it back" % hit.group(0))
    if seed is None:
        seed = random.SystemRandom().randrange(1, 10 ** 6)
    cards = deal(customer, n, seed)
    _write_json(_path(d, "panel.json"), {"n": n, "seed": seed, "customer": customer, "pitch": pitch,
                                         "price_pitch": price_pitch})
    _write_json(_path(d, "personas.json"), cards)
    os.makedirs(_path(d, "briefs"), exist_ok=True)
    os.makedirs(_path(d, "answers"), exist_ok=True)
    return cards


def load_state(d):
    try:
        return _read_json(_path(d, "panel.json")), _read_json(_path(d, "personas.json"))
    except FileNotFoundError:
        raise PanelError("no panel in %s: run init first" % d)


BRIEF = """You are a simulated buyer on a consumer panel. A founder wants to know, before spending any money, whether real people like you would buy. Your answer is only useful if it is honest: most people do not buy most things, and a polite yes is worse than a clear no.

=== WHO YOU ARE ===
{name}, {age}. {segment}. You earn about ${income:,} a year.
How you buy: {behaviour}. {behaviour_how}
{habit_line}The first thing that comes to mind when you hear an offer like this: "{objection}"
You are one of these people: {target}.
=== END ===

=== WHAT IS BEING OFFERED (you see it for the first time, the way a passer-by or a scroller would) ===
{pitch}
=== END ===

Decide as {name} would, with {name}'s money, habits and doubts, in a normal week. Do not be agreeable. Do not invent facts about the business beyond what is written above.

Create the file {out} with your file-writing tool (do not just print the answer in your reply) containing ONLY this JSON, no markdown fence, nothing else:
{{
  "id": "{id}",
  "buys": true or false,
  "purchases_first_month": how many times you would buy in the first month (0 if you would not buy),
  "reason_code": one of {reasons},
  "reason": "why, in one or two sentences, in your own voice",
  "objection": "the doubt that weighs most for you, in your own words",
  "would_change_my_mind": "the one thing that would flip your answer, or empty"
}}
"""

PRICE_BRIEF = """You are a simulated buyer on a consumer panel. A founder wants to know what people like you think this is worth, before setting a price. Nobody has told you the price, and you should not guess what the founder has in mind: answer from what it is worth to you.

=== WHO YOU ARE ===
{name}, {age}. {segment}. You earn about ${income:,} a year.
How you buy: {behaviour}. {behaviour_how}
{habit_line}The first thing that comes to mind when you hear an offer like this: "{objection}"
You are one of these people: {target}.
=== END ===

=== WHAT IS BEING OFFERED (you see it for the first time) ===
{pitch}
=== END ===

Answer as {name} would, with {name}'s money and habits. Give prices in the same terms the offer is sold in (for example per year, if it is a yearly subscription). Each price must be higher than the one before it.

Create the file {out} with your file-writing tool (do not just print the answer in your reply) containing ONLY this JSON, no markdown fence, nothing else:
{{
  "id": "{id}",
  "price_too_cheap": the price at which it would seem too cheap to be any good (a number),
  "price_cheap": the price at which it would feel like a bargain (a number),
  "price_expensive": the price at which it starts to feel expensive but you might still buy (a number),
  "price_too_expensive": the price at which you would not buy it at all (a number)
}}
"""


def write_briefs(d, wave=WAVE):
    state, cards = load_state(d)
    target = state["customer"]["target"]
    jobs = [("", BRIEF, state["pitch"])]
    if state.get("price_pitch"):
        jobs.append((PRICE_SUFFIX, PRICE_BRIEF, state["price_pitch"]))
    todo = []
    for c in cards:
        for suffix, template, pitch in jobs:
            job = c["id"] + suffix
            out = _path(d, "answers", job + ".json")
            if _answer_ok(out, job) is None:
                continue
            brief = template.format(pitch=pitch, target=target, out=os.path.abspath(out),
                                    habit_line=("Your day: %s.\n" % c["habit"]) if c.get("habit") else "",
                                    reasons=" / ".join(REASONS), **c)
            bp = _path(d, "briefs", job + ".md")
            with open(bp, "w", encoding="utf-8") as fh:
                fh.write(brief)
            todo.append((job, os.path.abspath(bp)))
    waves = [todo[i:i + wave] for i in range(0, len(todo), wave)]
    return waves


def _answer_ok(path, pid):
    """None if the answer file is good, else a short problem string.

    pid is a buyer id (the buy answer) or <id>.price (the price answer)."""
    if not os.path.exists(path):
        return "missing"
    try:
        a = _read_json(path)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return "not valid JSON"
    if not isinstance(a, dict):
        return "not a JSON object"
    if pid.endswith(PRICE_SUFFIX):
        if a.get("id") != pid[: -len(PRICE_SUFFIX)]:
            return "id is %r, expected %s" % (a.get("id"), pid[: -len(PRICE_SUFFIX)])
        vals = [_num(a.get(k)) for k in PRICE_FIELDS]
        if any(v is None or v <= 0 for v in vals):
            return "needs four prices above zero: " + ", ".join(PRICE_FIELDS)
        return None
    missing = ANSWER_FIELDS - set(a)
    if missing:
        return "missing " + ", ".join(sorted(missing))
    if a.get("id") != pid:
        return "id is %r, expected %s" % (a.get("id"), pid)
    if not isinstance(a.get("buys"), bool):
        return "'buys' must be true or false"
    if a.get("reason_code") not in REASONS:
        return "reason_code %r is not one of %s" % (a.get("reason_code"), ", ".join(REASONS))
    return None


def save(d, pid, text):
    """File a buyer's OWN answer that it printed instead of writing. Never used to answer for a buyer."""
    state, cards = load_state(d)
    buyer = pid[: -len(PRICE_SUFFIX)] if pid.endswith(PRICE_SUFFIX) else pid
    if buyer not in {c["id"] for c in cards}:
        raise PanelError("no buyer %s on this panel" % buyer)
    if buyer != pid and not state.get("price_pitch"):
        raise PanelError("this panel has no price briefs (init without --price-pitch)")
    start = text.find("{")
    if start < 0:
        raise PanelError("no JSON object in the reply")
    try:
        obj, _ = json.JSONDecoder().raw_decode(text[start:])
    except json.JSONDecodeError as e:
        raise PanelError("the reply's JSON does not parse: %s" % e)
    path = _path(d, "answers", pid + ".json")
    _write_json(path, obj)
    prob = _answer_ok(path, pid)
    if prob:
        os.remove(path)
        raise PanelError("%s's answer is not valid (%s); re-run its brief instead" % (pid, prob))
    return path


def check(d):
    state, cards = load_state(d)
    suffixes = [""] + ([PRICE_SUFFIX] if state.get("price_pitch") else [])
    probs = []
    for c in cards:
        for suffix in suffixes:
            job = c["id"] + suffix
            p = _answer_ok(_path(d, "answers", job + ".json"), job)
            if p:
                probs.append((job, p))
    return probs


# ── tally ───────────────────────────────────────────────────────────────────────
def _rate(rows):
    return (sum(1 for r in rows if r["buys"]) / len(rows)) if rows else 0.0


def _num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def tally(d):
    state, cards = load_state(d)
    by_id = {c["id"]: c for c in cards}
    rows, skipped = [], []
    for c in cards:
        path = _path(d, "answers", c["id"] + ".json")
        p = _answer_ok(path, c["id"])
        if p:
            skipped.append((c["id"], p))
            continue
        a = _read_json(path)
        # The card wins: an answer that adds its own "income" or "segment"
        # must not change which group the buyer is counted in.
        rows.append(dict({k: v for k, v in a.items() if k != "id"}, **by_id[c["id"]]))
    if not rows:
        raise PanelError("no valid answers yet: run the briefs first (panel.py prompts)")

    def group(key):
        out = {}
        for r in rows:
            out.setdefault(r[key], []).append(r)
        return sorted(((k, len(v), _rate(v)) for k, v in out.items()), key=lambda t: -t[2])

    # income in thirds of the dealt range, so the bands mean the same thing every run
    incomes = sorted(r["income"] for r in rows)
    cut1, cut2 = incomes[len(incomes) // 3], incomes[2 * len(incomes) // 3]
    for r in rows:
        r["income_band"] = ("under $%s" % "{:,}".format(cut1)) if r["income"] < cut1 else (
            ("$%s and up" % "{:,}".format(cut2)) if r["income"] >= cut2 else "$%s to $%s" % ("{:,}".format(cut1), "{:,}".format(cut2)))

    no = [r for r in rows if not r["buys"]]
    yes = [r for r in rows if r["buys"]]

    def reasons(rs):
        out = {}
        for r in rs:
            out.setdefault(r["reason_code"], []).append(r)
        return sorted(((k, v) for k, v in out.items()), key=lambda kv: -len(kv[1]))

    def mean(vals):
        vals = [v for v in vals if v is not None]
        return sum(vals) / len(vals) if vals else None

    res = {
        "business": state["customer"]["business"], "seed": state["seed"], "dealt": len(cards),
        "answered": len(rows), "skipped": skipped, "buys": len(yes), "passes": len(no),
        "buy_rate": len(yes) / len(rows),
        "by_segment": group("segment"), "by_behaviour": group("behaviour"), "by_income": group("income_band"),
        "why_not": [(k, len(v), [r["reason"] for r in v[:2]], [r["id"] for r in v[:2]]) for k, v in reasons(no)],
        "why_yes": [(k, len(v), [r["reason"] for r in v[:2]], [r["id"] for r in v[:2]]) for k, v in reasons(yes)],
        "flip": [r["would_change_my_mind"] for r in no if (r.get("would_change_my_mind") or "").strip()],
        "purchases_first_month_per_buyer": mean([_num(r.get("purchases_first_month")) for r in yes]),
        "price_answers": sum(1 for c in cards if _answer_ok(_path(d, "answers", c["id"] + PRICE_SUFFIX + ".json"),
                                                           c["id"] + PRICE_SUFFIX) is None),
    }
    return res


def results_md(res):
    pct = lambda v: "%.0f%%" % (v * 100)
    L = ["# Buyer panel: %s" % res["business"], ""]
    L.append("**%d buy · %d pass** (%s buy) out of %d simulated buyers. Seed %s, so the same cards can be dealt again."
             % (res["buys"], res["passes"], pct(res["buy_rate"]), res["answered"], res["seed"]))
    if res["skipped"]:
        L.append("")
        L.append("%d of %d buyers have no valid answer and are left out: %s." % (
            len(res["skipped"]), res["dealt"], ", ".join("%s (%s)" % s for s in res["skipped"][:10])))
    L.append("")
    L.append("These are simulated buyers, not customers. Use this to find objections and weak spots, then confirm the"
             " big ones with real people before you spend.")
    for title, key in (("By segment", "by_segment"), ("By buying behaviour", "by_behaviour"), ("By income", "by_income")):
        L += ["", "## %s" % title, "", "| group | buyers | buy rate |", "| --- | ---: | ---: |"]
        for k, n, r in res[key]:
            L.append("| %s | %d | %s%s |" % (k, n, pct(r), "  (thin)" if n < 8 else ""))
    L += ["", "## Why they pass", "", "| reason | buyers | in their words |", "| --- | ---: | --- |"]
    for k, n, quotes, ids in res["why_not"]:
        L.append("| %s | %d | %s |" % (k, n, " · ".join('"%s" (%s)' % (q.replace("|", "/"), i) for q, i in zip(quotes, ids))))
    L += ["", "## Why they buy", "", "| reason | buyers | in their words |", "| --- | ---: | --- |"]
    for k, n, quotes, ids in res["why_yes"]:
        L.append("| %s | %d | %s |" % (k, n, " · ".join('"%s" (%s)' % (q.replace("|", "/"), i) for q, i in zip(quotes, ids))))
    if res["flip"]:
        L += ["", "## What would flip a no", ""]
        for f in res["flip"][:12]:
            L.append("- %s" % f)
    if res["purchases_first_month_per_buyer"] is not None:
        L += ["", "Buyers say they would buy **%.1f times** in the first month on average." % res["purchases_first_month_per_buyer"]]
    if res["price_answers"]:
        L += ["", "%d buyers gave all four price answers, without seeing a price. Run founder-pricing's"
              " van_westendorp.py on the answers folder." % res["price_answers"]]
    else:
        L += ["", "No price answers: this panel was dealt without --price-pitch."]
    return "\n".join(L) + "\n"


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--dir", default=os.path.join("founder", "panel"))
    sub = ap.add_subparsers(dest="cmd", required=True)
    i = sub.add_parser("init")
    i.add_argument("--customer", required=True)
    i.add_argument("--pitch", required=True)
    i.add_argument("--price-pitch", help="the pitch with every price taken out, for the price questions")
    i.add_argument("--n", type=int, default=100)
    i.add_argument("--seed", type=int)
    p = sub.add_parser("prompts")
    p.add_argument("--wave", type=int, default=WAVE)
    sub.add_parser("check")
    sv = sub.add_parser("save")
    sv.add_argument("id", help="a buyer id, or <id>.price for its price answer")
    t = sub.add_parser("tally")
    t.add_argument("--out")
    sub.add_parser("status")
    a = ap.parse_args(argv)
    try:
        if a.cmd == "init":
            cards = init(a.dir, a.customer, a.pitch, a.n, a.seed, a.price_pitch)
            st, _ = load_state(a.dir)
            print("dealt %d buyers (seed %s) into %s. Next: panel.py prompts" % (len(cards), st["seed"], a.dir))
        elif a.cmd == "prompts":
            waves = write_briefs(a.dir, a.wave)
            n = sum(len(w) for w in waves)
            if not n:
                print("every buyer has a valid answer. Next: panel.py tally")
            else:
                print("%d briefs in %d waves of up to %d. Launch one wave at a time:" % (n, len(waves), a.wave))
                for k, w in enumerate(waves, 1):
                    print("wave %d: %s" % (k, " ".join("%s=%s" % job for job in w)))
        elif a.cmd == "check":
            probs = check(a.dir)
            if not probs:
                print("all answers present and valid")
            for pid, prob in probs:
                print("%s: %s" % (pid, prob))
            return 1 if probs else 0
        elif a.cmd == "save":
            print("saved %s" % save(a.dir, a.id, sys.stdin.read()))
        elif a.cmd == "tally":
            res = tally(a.dir)
            text = results_md(res)
            out = a.out or _path(a.dir, "results.md")
            with open(out, "w", encoding="utf-8") as fh:
                fh.write(text)
            _write_json(_path(a.dir, "results.json"), res)
            print("%d buy · %d pass (%.0f%%). Wrote %s" % (res["buys"], res["passes"], res["buy_rate"] * 100, out))
        elif a.cmd == "status":
            st, cards = load_state(a.dir)
            probs = check(a.dir)
            jobs = len(cards) * (2 if st.get("price_pitch") else 1)
            print("%d buyers dealt (seed %s), %d of %d briefs answered, %d to go" % (
                len(cards), st["seed"], jobs - len(probs), jobs, len(probs)))
    except PanelError as e:
        print("error: %s" % e, file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
