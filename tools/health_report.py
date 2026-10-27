#!/usr/bin/env python3
"""Monthly health report (safety kit, Stacey 2026-10-27).

Collects the automatic checks into one ranked, plain-language list: what is most likely to cause trouble first.
Runs on the 1st of each month in GitHub (.github/workflows/health.yml), which opens an issue with the report.
The AI reviewer then adds "what will break first" when the ANTHROPIC_API_KEY secret is set.

  python3 tools/health_report.py [--out health-report.md]
In GitHub it also reads security alerts and test runs (GITHUB_TOKEN, GITHUB_REPOSITORY).
"""
import datetime
import json
import os
import re
import subprocess
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "tools"))
import rules_check  # noqa: E402

CODE_DIRS = ("app/", "admin/", "shared/", "widgets/", "supabase/", "tools/")


def sh(*a):
    return subprocess.run(a, cwd=ROOT, capture_output=True, text=True).stdout


def gh(path):
    token, repo = os.environ.get("GITHUB_TOKEN"), os.environ.get("GITHUB_REPOSITORY")
    if not token or not repo:
        return None
    req = urllib.request.Request(f"https://api.github.com/repos/{repo}{path}", headers={"authorization": f"Bearer {token}", "accept": "application/vnd.github+json"})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return json.load(r)
    except Exception:
        return None


def latest_npm(name):
    out = subprocess.run(["npm", "view", name, "version"], capture_output=True, text=True).stdout.strip()
    return out or None


def collect():
    high, medium, low, good = [], [], [], []

    problems = rules_check.check(rules_check.tracked_files())
    if problems:
        high.append(f"{len(problems)} project rule problem(s), for example: {problems[0]}")
    else:
        good.append("Project rules: all checks pass.")

    alerts = gh("/code-scanning/alerts?state=open&per_page=100")
    if alerts is None:
        low.append("Security scan alerts could not be read here (they show under the GitHub Security tab).")
    elif alerts:
        sev = sorted({(a.get("rule", {}).get("security_severity_level") or a.get("rule", {}).get("severity") or "unknown") for a in alerts})
        (high if any(s in ("critical", "high", "error") for s in sev) else medium).append(f"{len(alerts)} open security scan finding(s) ({', '.join(sev)}). See the Security tab.")
    else:
        good.append("Security scan: no open findings.")

    dep = gh("/dependabot/alerts?state=open&per_page=100")
    if dep:
        high.append(f"{len(dep)} outside package(s) with a known security problem. Dependabot has opened or will open updates.")
    elif dep == []:
        good.append("Outside packages: no known security problems.")

    runs = gh("/actions/workflows/tests.yml/runs?branch=main&per_page=30")
    if runs and runs.get("workflow_runs"):
        last = runs["workflow_runs"][0]
        failed = [r for r in runs["workflow_runs"] if r.get("conclusion") == "failure"]
        if last.get("conclusion") == "failure":
            high.append("The latest automatic test run on main failed. Nothing can be pushed to Live until it passes.")
        elif failed:
            low.append(f"{len(failed)} of the last {len(runs['workflow_runs'])} test runs failed before being fixed.")
        else:
            good.append(f"Automatic tests: the last {len(runs['workflow_runs'])} runs on main passed.")

    since = (datetime.date.today() - datetime.timedelta(days=31)).isoformat()
    untested = []
    for row in sh("git", "log", f"--since={since}", "--format=%h%x09%s").splitlines():
        h, _, subj = row.partition("\t")
        files = sh("git", "show", "--name-only", "--format=", h).split()
        code = [f for f in files if f.startswith(CODE_DIRS) and not rules_check.is_test(f) and not f.startswith("supabase/tests/")]
        if code and not any(rules_check.is_test(f) or f.startswith("supabase/tests/") for f in files):
            untested.append(f"{h} {subj}")
    if untested:
        medium.append(f"{len(untested)} change(s) to code in the last month came without a test change: " + "; ".join(untested[:5]) + ("..." if len(untested) > 5 else ""))

    pins = {}
    for f in rules_check.tracked_files():
        if f.startswith("supabase/functions/") and f.endswith(".ts"):
            for name, ver in re.findall(r"npm:(@?[^@\"']+)@([0-9]+\.[0-9]+\.[0-9]+)", rules_check.read(f)):
                pins[name] = ver
    try:
        pkg = json.loads(rules_check.read("package.json"))
        pins.update(pkg.get("devDependencies", {}))
    except Exception:
        pass
    behind = []
    for name, ver in sorted(pins.items()):
        latest = latest_npm(name)
        if latest and latest.split(".")[0] != ver.split(".")[0]:
            behind.append(f"{name} {ver} (newest {latest}, a major version ahead)")
    if behind:
        medium.append("Outside libraries a major version behind (check release notes before updating): " + "; ".join(behind))
    elif pins:
        good.append("Outside libraries: no major version behind.")

    todos = [l for l in sh("git", "grep", "-n", "-E", "TODO|FIXME|XXX", "--", *CODE_DIRS).splitlines() if "rules_check" not in l and "health_report" not in l]
    if todos:
        low.append(f"{len(todos)} TODO or FIXME note(s) left in the code, for example {todos[0][:120]}")

    sizes = sorted(((os.path.getsize(os.path.join(ROOT, f)), f) for f in rules_check.tracked_files() if f.startswith(CODE_DIRS) and f.endswith((".js", ".ts", ".mjs", ".sql", ".php"))), reverse=True)[:3]
    low.append("Largest code files (harder to change safely): " + ", ".join(f"{f} ({s // 1024} KB)" for s, f in sizes))
    return high, medium, low, good


def render(high, medium, low, good):
    today = datetime.date.today().strftime("%B %Y")
    out = [f"# DELA health report, {today}", "", "Ranked by what is most likely to cause trouble first. Automatic checks only; the AI section below adds judgement when it is set up.", ""]
    for title, items in (("Fix first", high), ("Fix soon", medium), ("Worth knowing", low), ("Working well", good)):
        out.append(f"## {title}")
        out += [f"{i}. {x}" for i, x in enumerate(items, 1)] if items else ["Nothing here."]
        out.append("")
    return "\n".join(out)


if __name__ == "__main__":
    out = sys.argv[sys.argv.index("--out") + 1] if "--out" in sys.argv else "health-report.md"
    text = render(*collect())
    open(out, "w").write(text)
    print(text)
