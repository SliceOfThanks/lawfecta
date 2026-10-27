#!/usr/bin/env python3
"""Project rule checker (safety kit, Stacey 2026-10-27).

Checks the rules in CLAUDE.md that used to be followed from memory. Runs in GitHub Tests on every push,
and in Claude Code after each edit (.claude/settings.json).

  python3 tools/rules_check.py                 check the whole repo
  python3 tools/rules_check.py --commits A..B  also check that every bug fix commit in A..B changed a test

A line that must break a rule on purpose carries "rules-ok:" and the reason on the same line.
Exit code 1 lists every problem in plain words.
"""
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# The only full web addresses a BD widget may hold: the DELA api on Supabase and the jsDelivr code address
WIDGET_URLS = [re.compile(r"https://[a-z0-9]{20}\.supabase\.co/functions/v1/api"), re.compile(r"https://cdn\.jsdelivr\.net/gh/")]
WIDGET_REGEX_CALLS = re.compile(r"preg_[a-z_]+\s*\(|\bereg[a-z_]*\s*\(|\bmb_ereg[a-z_]*\s*\(|new RegExp|\.match\s*\(\s*/|\.replace\s*\(\s*/|\.split\s*\(\s*/|/[^/\s]+/[gimsuy]*\.test\s*\(")
MONEY_TYPES = re.compile(r"\b([a-z_]*(cents|price|amount|fee|bps)[a-z_]*)\s+(numeric|real|double precision|float[0-9]*|money|decimal)", re.I)
DOLLARS = re.compile(r"\$[0-9]")
SECRETS = [
    ("an Anthropic key", re.compile(r"sk-ant-[A-Za-z0-9_-]{20,}")),
    ("an OpenAI key", re.compile(r"\bsk-(proj-)?[A-Za-z0-9]{32,}")),
    ("a GitHub token", re.compile(r"\b(ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})")),
    ("a Supabase secret key", re.compile(r"\bsb_secret_[A-Za-z0-9_-]{20,}")),
    ("a Brevo key", re.compile(r"\bxkeysib-[a-f0-9]{40,}")),
    ("a Stripe secret key", re.compile(r"\b(sk|rk)_(live|test)_[A-Za-z0-9]{20,}")),
    ("a private key", re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----")),
    ("a signed token (JWT)", re.compile(r"\beyJ[A-Za-z0-9_-]{30,}\.eyJ[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{20,}")),
]
EM_DASH = "—"
SKIP_DIRS = {".git", "node_modules", "shots", "docs/specs"}
TEXT_EXT = {".php", ".js", ".mjs", ".ts", ".sql", ".md", ".json", ".yml", ".yaml", ".py", ".sh", ".html", ".css", ".toml", ".txt"}


def tracked_files():
    try:
        out = subprocess.run(["git", "ls-files", "-co", "--exclude-standard"], cwd=ROOT, capture_output=True, text=True, check=True).stdout
        files = [f for f in out.splitlines() if f]
    except Exception:
        files = []
        for d, dirs, names in os.walk(ROOT):
            rel = os.path.relpath(d, ROOT)
            dirs[:] = [x for x in dirs if os.path.normpath(os.path.join(rel, x)) not in SKIP_DIRS and x not in SKIP_DIRS]
            files += [os.path.normpath(os.path.join(rel, n)) for n in names]
    return sorted(f for f in files if os.path.splitext(f)[1] in TEXT_EXT and not any(f == s or f.startswith(s + "/") for s in SKIP_DIRS) and os.path.isfile(os.path.join(ROOT, f)))


def read(f):
    with open(os.path.join(ROOT, f), encoding="utf-8", errors="replace") as fh:
        return fh.read()


def is_test(f):
    return f.startswith("tests/") or "/tests/" in f or f.endswith("_test.ts") or f.endswith("_test.mjs") or f.endswith("_test.py")


def check(files):
    problems = []

    def add(f, n, rule, msg):
        problems.append(f"{f}:{n}  [{rule}] {msg}")

    for f in files:
        text = read(f)
        lines = text.split("\n")

        # BD widget rules
        if f.startswith("widgets/") and f.endswith(".php"):
            for n, line in enumerate(lines, 1):
                if "rules-ok:" in line:
                    continue
                if "\\" in line:
                    add(f, n, "widget-backslash", "BD widgets may not contain a backslash.")
                if WIDGET_REGEX_CALLS.search(line):
                    add(f, n, "widget-regex", "BD widgets may not use regex functions.")
                for url in re.findall(r"https?://[^\s'\"<>)]+", line):
                    if not any(p.match(url) for p in WIDGET_URLS):
                        add(f, n, "widget-url", f"BD widgets may not hold example or outside web addresses ({url}).")
                if "[widget=" in line.lower():
                    add(f, n, "widget-shortcode", "BD widgets may not contain a literal widget shortcode.")
            if os.path.basename(f) == "DELA-Auth.php":
                body = text.strip()
                if not body.startswith("<?php") or not body.endswith("?>"):
                    add(f, 1, "helper-widget", "The DELA-Auth helper widget must start with <?php and end with ?>.")

        # Database: money in whole cents, no public access
        if f.startswith("supabase/migrations/") and f.endswith(".sql"):
            tables = set(re.findall(r"create table (?:if not exists )?(?:public\.)?([a-z_]+)", text, re.I))
            rls = set(re.findall(r"alter table (?:public\.)?([a-z_]+) enable row level security", text, re.I))
            # A loop over every table (as in 0001) covers them all; supabase/tests/zz_security_test.sql proves it on a real database
            if re.search(r"execute format\('alter table %I enable row level security'", text, re.I):
                rls |= tables
            for t in sorted(tables - rls):
                add(f, 1, "rls", f"Table {t} is created without row level security turned on in the same file.")
            for n, line in enumerate(lines, 1):
                if "rules-ok:" in line or line.strip().startswith("--"):
                    continue
                if re.search(r"\bcreate policy\b", line, re.I):
                    add(f, n, "no-public-policy", "Tables have no policies; data is reached only through the api with the service role.")
                if re.search(r"\bgrant\b.*\bto\b.*\b(anon|authenticated|public)\b", line, re.I):
                    add(f, n, "no-public-grant", "Nothing is granted to anon, authenticated or public.")
                m = MONEY_TYPES.search(line)
                if m:
                    add(f, n, "money-cents", f"Money is stored in whole cents (bigint or int), not {m.group(3)} ({m.group(1)}).")

        # No hard-coded prices in code people see; numbers come from settings
        if (f.startswith(("app/", "admin/", "shared/", "supabase/functions/")) and f.endswith((".js", ".ts")) and not is_test(f)):
            for n, line in enumerate(lines, 1):
                if "rules-ok:" in line:
                    continue
                if DOLLARS.search(line):
                    add(f, n, "no-hard-coded-price", "Dollar amounts come from settings (D.money with a setting), never typed into the code.")

        # Secrets never go in GitHub
        for n, line in enumerate(lines, 1):
            if "rules-ok:" in line:
                continue
            for name, pat in SECRETS:
                if pat.search(line):
                    add(f, n, "no-secrets", f"This looks like {name}. Secrets go only in Supabase or GitHub secrets.")

        # Exact versions for every outside library
        if f.endswith("package.json"):
            try:
                pkg = json.loads(text)
            except ValueError:
                pkg = {}
            for sect in ("dependencies", "devDependencies"):
                for name, ver in (pkg.get(sect) or {}).items():
                    if not re.fullmatch(r"[0-9]+\.[0-9]+\.[0-9]+", str(ver)):
                        add(f, 1, "pin-versions", f"{name} must be pinned to an exact version, not {ver}.")
        if f.startswith("supabase/functions/") and f.endswith(".ts"):
            for n, line in enumerate(lines, 1):
                for spec in re.findall(r"[\"'](npm:|jsr:)([^\"']+)[\"']", line):
                    if not re.search(r"@[0-9]+\.[0-9]+\.[0-9]+", spec[1].lstrip("@")):
                        add(f, n, "pin-versions", f"{spec[0]}{spec[1]} must name an exact version.")
        if f.startswith(".github/workflows/"):
            for n, line in enumerate(lines, 1):
                m = re.search(r"uses:\s*([^\s#]+)", line)
                if m and "@" not in m.group(1) and not m.group(1).startswith("./"):
                    add(f, n, "pin-versions", f"{m.group(1)} must name a version.")

        # Plain writing for Stacey: no em dashes in what she reads
        if (f.startswith("docs/") or f in ("STATUS.md", "CLAUDE.md") or (f.startswith(("app/", "admin/", "shared/")) and f.endswith(".js"))):
            for n, line in enumerate(lines, 1):
                if EM_DASH in line:
                    add(f, n, "plain-writing", "No em dashes in anything Stacey or members read.")
    return problems


def check_commits(rng):
    """Fixed stays fixed: a commit that fixes a bug must add or change a test in the same commit."""
    problems = []
    try:
        log = subprocess.run(["git", "log", "--format=%H%x09%s", rng], cwd=ROOT, capture_output=True, text=True, check=True).stdout
    except Exception as e:
        return [f"could not read commits {rng}: {e}"]
    for row in log.splitlines():
        sha, _, subject = row.partition("\t")
        if not re.match(r"(fix|fixes|fixed|bug)\b", subject.strip(), re.I) or "rules-ok:" in subject:
            continue
        changed = subprocess.run(["git", "show", "--name-only", "--format=", sha], cwd=ROOT, capture_output=True, text=True).stdout.split()
        if not any(is_test(c) for c in changed):
            problems.append(f"commit {sha[:7]} \"{subject}\"  [fixed-stays-fixed] A bug fix must come with a test that fails before the fix and passes after.")
    return problems


def main(argv):
    problems = check(tracked_files())
    if "--commits" in argv:
        rng = argv[argv.index("--commits") + 1]
        problems += check_commits(rng)
    if problems:
        print("Project rules: " + str(len(problems)) + " problem(s)")
        for p in problems:
            print("  " + p)
        return 1
    print("Project rules: all checks passed")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
