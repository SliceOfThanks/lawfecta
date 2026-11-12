#!/usr/bin/env python3
"""Lists the quoted names in the test prompts (docs/tests/*.md) that are not written anywhere in DELA's screens or
server texts. A name that is not found was renamed or removed, or is something the tester types; each one is looked at
by hand. Usage: python3 tools/prompt_names.py [file ...]   (--count for totals only)"""
import glob, re, sys, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = ["app/dela-app.js", "app/dela-security.js", "admin/dela-admin.js", "shared/dela-core.js"]
SRC += glob.glob(os.path.join(ROOT, "supabase/functions/api/**/*.ts"), recursive=True) + glob.glob(os.path.join(ROOT, "supabase/migrations/*.sql")) + [os.path.join(ROOT, "config/decisions.json")]
text = ""
for f in SRC:
    p = f if os.path.isabs(f) else os.path.join(ROOT, f)
    if p.endswith("_test.ts"): continue
    text += open(p, encoding="utf-8").read() + "\n"
# what the code writes: also with escaped quotes and doubled apostrophes undone
hay = text.replace('\\"', '"').replace("''", "'")
def known(name):
    n = name.strip()
    if n in hay: return True
    # a name may be put together in code ("Sign version " + n): accept when its longest wordy part is there
    parts = [x for x in re.split(r"\d+(?:[.,]\d+)*|\$[\d,.]+", n) if len(x.strip()) >= 6]
    return bool(parts) and all(x.strip() in hay for x in parts)
files = [a for a in sys.argv[1:] if not a.startswith("--")] or sorted(glob.glob(os.path.join(ROOT, "docs/tests/*.md")))
total = 0
for f in files:
    lines = open(f, encoding="utf-8").read().split("\n")
    start = next((i for i, l in enumerate(lines) if l.strip() == "Steps" or re.match(r"^(TEST |OWNER|ATTORNEY|FREELANCER|[A-Z ]+\(log in once\))", l)), None)
    if start is None: start = next((i for i, l in enumerate(lines) if l.startswith("10. Report")), 0)
    miss = []
    for i in range(start, len(lines)):
        l = lines[i]
        if not re.search(r"\b(Do|Find|Expect|Go to)\b", l) and not re.match(r"^\s*\d+\.", l): continue
        typed = re.search(r"\b(type|types|typed|paste|enter|write)\b[^\"]*\"", l)
        for m in re.finditer(r'"([^"\n]{2,90})"', l):
            name = m.group(1)
            if typed and m.start() >= typed.start(): continue
            if re.match(r"^(https?:|/|[\w.+-]+@)", name) or name.endswith(".txt") or name.endswith(".pdf"): continue
            if not known(name): miss.append((i + 1, name))
    total += len(miss)
    if "--count" in sys.argv: print(f"{len(miss):4d}  {os.path.basename(f)}")
    else:
        for ln, name in miss: print(f"{os.path.basename(f)}:{ln}: {name}")
print("total not found:", total)
