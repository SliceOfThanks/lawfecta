"""Builds the Decision Sheet and the starting database values from config/decisions.json.

python3 tools/decisions.py            writes docs/Decision_Sheet.md, docs/Decision_Sheet.docx (needs pandoc)
                                      and supabase/migrations/0003_seed_decisions.sql
python3 tools/decisions.py --check    fails if those files are out of date (run before every commit)

The seed is applied once to a new project. Later changes are made in the admin area (with history),
and approved values are copied back into config/decisions.json so GitHub stays the record.
"""
import json
import os
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CFG = os.path.join(ROOT, "config", "decisions.json")
MD = os.path.join(ROOT, "docs", "Decision_Sheet.md")
DOCX = os.path.join(ROOT, "docs", "Decision_Sheet.docx")
SQL = os.path.join(ROOT, "supabase", "migrations", "0003_seed_decisions.sql")

STATUS_WORD = {"C": "Confirmed", "R": "Suggested", "O": "Open", "G": "Needs a gate"}
NOTICE = ("DELA is for operations work. Do not enter confidential client information, client names, "
          "case numbers or privileged details. You are responsible for what you enter.")


def q(s):
    return "'" + str(s).replace("'", "''") + "'"


def jq(v):
    return q(json.dumps(v, separators=(",", ":"))) + "::jsonb"


def money(c):
    return "$" + format(c / 100, ",.2f").replace(".00", "")


def show(item):
    v, unit = item["value"], item.get("unit", "")
    if isinstance(v, bool):
        return "Yes" if v else "No"
    if unit == "cents":
        return money(v)
    if unit == "basis points":
        return f"{v / 100:g}%"
    if isinstance(v, list):
        return ", ".join(str(x) for x in v)
    if isinstance(v, str):
        return v.replace("_", " ")
    return f"{v} {unit}".strip()


def limit_cell(v):
    if v is True:
        return "Yes"
    if v is False:
        return "No"
    if v is None:
        return "No cap"
    return str(v)


def build_md(c):
    out = []
    out.append("# DELA Decision Sheet")
    out.append("")
    out.append(f"Version {c['sheet_version']}, updated {c['updated']}. Built from config/decisions.json.")
    out.append("")
    out.append("How to use this sheet: for each line, write Approve, or write the number you want instead. "
               "Every value can be changed later in the DELA admin area, and every change is saved with its history.")
    out.append("")
    out.append("What the status means:")
    out.append("")
    for k, v in c["status_legend"].items():
        out.append(f"- **{STATUS_WORD[k]}**: {v}")
    out.append("")

    p = c["plans"]
    out.append("## 1. Plans and prices")
    out.append("")
    out.append("Attorneys and freelancers have separate plans. Each side pays its own fee, based on its own plan.")
    out.append("")
    out.append("| Plan | Attorney monthly | Freelancer monthly | Fee per side | Status | Your decision |")
    out.append("|---|---|---|---|---|---|")
    for t in p["tiers"]:
        name = p["tier_names"][t]
        if t == "business":
            name = "Business (firm / agency)"
        a, f = p["attorney"], p["freelancer"]
        fee = f"{a['fee_bps'][t] / 100:g}%"
        out.append(f"| {name} | {money(a['monthly_cents'][t])} | {money(f['monthly_cents'][t])} | {fee} | {STATUS_WORD[a['status']]} | |")
    out.append("")
    out.append(f"- Yearly prices: {p['annual']['label']}. Status: {STATUS_WORD[p['annual']['status']]}. Your decision: ______")
    out.append("")

    out.append("## 2. Plan limits")
    out.append("")
    for side, title in (("attorney", "Attorney side"), ("freelancer", "Freelancer side"), ("both", "Both sides (each side counts its own)")):
        rows = [l for l in c["limits"] if l["side"] == side]
        if not rows:
            continue
        out.append(f"### {title}")
        out.append("")
        out.append("| Limit | Free | Plus | Pro | Business | Status | Your decision |")
        out.append("|---|---|---|---|---|---|---|")
        for l in rows:
            v = l["values"]
            per = " (per month)" if l["period"] == "month" else ""
            out.append(f"| {l['label']}{per} | {limit_cell(v['free'])} | {limit_cell(v['plus'])} | {limit_cell(v['pro'])} | {limit_cell(v['business'])} | {STATUS_WORD[l['status']]} | |")
        out.append("")
        notes = [l for l in rows if l.get("note")]
        for l in notes:
            out.append(f"- {l['label']}: {l['note']}")
        if notes:
            out.append("")

    n = 3
    for sec in c["sections"]:
        out.append(f"## {n}. {sec['title']}")
        out.append("")
        out.append("| Item | Suggested value | Status | Where it comes from | Your decision |")
        out.append("|---|---|---|---|---|")
        for it in sec["items"]:
            label = it["label"] + (f". {it['note']}" if it.get("note") else "")
            out.append(f"| {label} | {show(it)} | {STATUS_WORD[it['status']]} | {it['source']} | |")
        out.append("")
        n += 1

    out.append(f"## {n}. On and off switches")
    out.append("")
    out.append("Every switch starts Off. In the admin area each one can be set to Off, Lawfecta Team only, Access list, or Everyone.")
    out.append("")
    out.append("| Switch | What has to happen before it goes on |")
    out.append("|---|---|")
    for s in c["switches"]:
        out.append(f"| {s['label']} | {s['gate']} |")
    out.append("")
    return "\n".join(out)


def build_sql(c):
    L = ["-- Starting values from the Decision Sheet. Generated by tools/decisions.py from config/decisions.json. Do not edit by hand.",
         f"-- Sheet version {c['sheet_version']}.", ""]
    p = c["plans"]

    L.append("-- Internal settings")
    internal = [
        ("environment", "staging", "Which copy this is (live or staging). Set once at setup.", "System", "C"),
        ("session.hours", 8, "Hours a DELA sign in lasts", "System", "R"),
        ("policy.version", c["sheet_version"], "Decision Sheet version in force", "System", "C"),
        ("data.notice_text", NOTICE, "Confidential information notice", "Platform rules decided by Stacey", "C"),
        ("plans.annual", p["annual"]["value"], p["annual"]["label"], "Plans and prices", p["annual"]["status"]),
    ]
    for key, val, label, section, st in internal:
        L.append(f"insert into settings (key, value, label, section, status, source) values ({q(key)}, {jq(val)}, {q(label)}, {q(section)}, {q(st)}, 'Setup') on conflict (key) do nothing;")
    L.append("")
    L.append("-- Decision Sheet settings")
    for sec in c["sections"]:
        for it in sec["items"]:
            L.append("insert into settings (key, value, label, section, unit, status, source, note) values ("
                     f"{q(it['key'])}, {jq(it['value'])}, {q(it['label'])}, {q(sec['title'])}, {q(it.get('unit', ''))}, "
                     f"{q(it['status'])}, {q(it['source'])}, {q(it.get('note', ''))}) on conflict (key) do nothing;")
    L.append("")
    L.append("insert into decision_log (decision_id, status, version, value, note)")
    L.append(f"select key, status, {q(c['sheet_version'])}, value, 'Starting value from the Decision Sheet' from settings;")
    L.append("")

    L.append("-- Plans: four for attorneys, four for freelancers")
    sort = 0
    for side in ("attorney", "freelancer"):
        pre = "att" if side == "attorney" else "fl"
        for t in p["tiers"]:
            sort += 1
            name = ("Attorney " if side == "attorney" else "Freelancer ") + (p[side]["business_name"] if t == "business" else p["tier_names"][t])
            L.append(f"insert into plans (code, side, tier, name, sort) values ({q(pre + '_' + t)}, {q(side)}, {q(t)}, {q(name)}, {sort}) on conflict (code) do nothing;")
    L.append("")

    L.append("-- What the plans can include")
    for l in c["limits"]:
        kind = "flag" if l["unit"] == "flag" else "quota"
        L.append("insert into features (key, side, label, unit, period, kind, status, source, note) values ("
                 f"{q(l['key'])}, {q(l['side'])}, {q(l['label'])}, {q(l['unit'])}, {q(l['period'])}, {q(kind)}, {q(l['status'])}, {q(l['source'])}, {q(l.get('note', ''))}) on conflict (key) do nothing;")
    L.append("")

    L.append("-- Version 1 of each plan (starting values; Stacey approves or edits them in the admin area)")
    for side in ("attorney", "freelancer"):
        pre = "att" if side == "attorney" else "fl"
        for t in p["tiers"]:
            code = f"{pre}_{t}"
            m = p[side]["monthly_cents"][t]
            annual = m * 10 if p["annual"]["value"] == "ten_times_monthly" else None
            annual_sql = "null" if annual is None else str(annual)
            L.append("with v as (insert into plan_versions (plan_code, version, monthly_cents, annual_cents, fee_bps, note) values ("
                     f"{q(code)}, 1, {m}, {annual_sql}, {p[side]['fee_bps'][t]}, {q('Starting values from Decision Sheet ' + c['sheet_version'])}) returning id)")
            vals = []
            for l in c["limits"]:
                if l["side"] not in (side, "both"):
                    continue
                v = l["values"][t]
                if isinstance(v, bool):
                    vals.append(f"({q(l['key'])}, {'true' if v else 'false'}, null)")
                elif v is None:
                    vals.append(f"({q(l['key'])}, true, null)")
                else:
                    vals.append(f"({q(l['key'])}, {'true' if v > 0 else 'false'}, {v})")
            L.append("insert into plan_features (plan_version_id, feature_key, enabled, quota_limit) select v.id, x.k, x.e, x.l from v, (values "
                     + ", ".join(vals) + ") as x(k, e, l);")
    L.append("update plan_versions set status = 'approved', effective_from = now() where version = 1 and status = 'draft';")
    L.append("")

    L.append("-- Switches, all off")
    for s in c["switches"]:
        L.append(f"insert into feature_switches (key, label, gate) values ({q(s['key'])}, {q(s['label'])}, {q(s['gate'])}) on conflict (key) do nothing;")
    L.append("")
    return "\n".join(L)


def main():
    c = json.load(open(CFG))
    md, sql = build_md(c), build_sql(c)
    if "--check" in sys.argv:
        bad = [f for f, body in ((MD, md), (SQL, sql)) if not os.path.exists(f) or open(f).read() != body]
        if bad:
            print("Out of date, run python3 tools/decisions.py:", ", ".join(os.path.relpath(b, ROOT) for b in bad))
            sys.exit(1)
        print("Decision Sheet and seed are up to date")
        return
    open(MD, "w").write(md)
    open(SQL, "w").write(sql)
    if shutil.which("pandoc"):
        subprocess.run(["pandoc", MD, "-o", DOCX], check=True)
    print("Wrote", os.path.relpath(MD, ROOT), os.path.relpath(SQL, ROOT), "and the Word sheet" if shutil.which("pandoc") else "")


if __name__ == "__main__":
    main()
