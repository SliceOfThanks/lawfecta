# Tests for tools/rules_check.py: each rule catches a planted problem and accepts the right form.
# python3 -m unittest tests/rules_test.py
import os
import subprocess
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "tools"))
import rules_check  # noqa: E402

BS = chr(92)


class RulesTest(unittest.TestCase):
    def run_on(self, files):
        with tempfile.TemporaryDirectory() as d:
            for name, body in files.items():
                os.makedirs(os.path.join(d, os.path.dirname(name)), exist_ok=True)
                with open(os.path.join(d, name), "w") as fh:
                    fh.write(body)
            old = rules_check.ROOT
            rules_check.ROOT = d
            try:
                return rules_check.check(sorted(files))
            finally:
                rules_check.ROOT = old

    def rules(self, files):
        return sorted({p.split("[")[1].split("]")[0] for p in self.run_on(files)})

    def test_widget_rules(self):
        bad = "<div>" + BS + "n</div><?php preg_match('/x/', $a); ?> see https://example.com [widget=Foo]"
        self.assertEqual(self.rules({"widgets/DELA-App.php": bad}), ["widget-backslash", "widget-regex", "widget-shortcode", "widget-url"])
        ok = "<div data-api-staging=\"https://abcdefghijklmnopqrst.supabase.co/functions/v1/api\"></div><script>var c = 'https://cdn.jsdelivr.net/gh/' + x;</script>"
        self.assertEqual(self.rules({"widgets/DELA-App.php": ok}), [])

    def test_helper_widget_shape(self):
        self.assertEqual(self.rules({"widgets/DELA-Auth.php": "<?php echo 1;"}), ["helper-widget"])
        self.assertEqual(self.rules({"widgets/DELA-Auth.php": "<?php echo 1; ?>"}), [])

    def test_database_rules(self):
        bad = "create table pay (id int, price_cents numeric);\ncreate policy p on pay for select using (true);\ngrant select on pay to anon;\n"
        self.assertEqual(self.rules({"supabase/migrations/0099_x.sql": bad}), ["money-cents", "no-public-grant", "no-public-policy", "rls"])
        ok = "create table pay (id int, price_cents bigint);\nalter table pay enable row level security;\nrevoke all on pay from anon;\n"
        self.assertEqual(self.rules({"supabase/migrations/0099_x.sql": ok}), [])

    def test_prices_come_from_settings(self):
        self.assertEqual(self.rules({"app/x.js": "h('p', {text: 'Only $19 a month'})"}), ["no-hard-coded-price"])
        self.assertEqual(self.rules({"app/x.js": "h('p', {text: D.money(plan.monthly_cents)})"}), [])
        self.assertEqual(self.rules({"app/x_test.ts": "query('select $1')"}), [])

    def test_secrets(self):
        fake = "sk-ant-" + "a" * 30
        self.assertEqual(self.rules({"notes.md": "key " + fake}), ["no-secrets"])
        self.assertEqual(self.rules({"x.ts": "const k = Deno.env.get('ANTHROPIC_API_KEY');"}), [])

    def test_pinned_versions(self):
        self.assertEqual(self.rules({"package.json": '{"devDependencies": {"a": "^1.2.3"}}'}), ["pin-versions"])
        self.assertEqual(self.rules({"supabase/functions/api/x.ts": 'import x from "npm:@supabase/supabase-js";'}), ["pin-versions"])
        self.assertEqual(self.rules({"supabase/functions/api/x.ts": 'import x from "npm:@supabase/supabase-js@2.118.0";'}), [])

    def test_plain_writing(self):
        self.assertEqual(self.rules({"docs/x.md": "This " + chr(0x2014) + " that"}), ["plain-writing"])

    def test_rules_ok_marker(self):
        self.assertEqual(self.rules({"app/x.js": "x = '$5'; // rules-ok: example in a help text"}), [])

    def test_fix_commits_need_a_test(self):
        with tempfile.TemporaryDirectory() as d:
            git = lambda *a: subprocess.run(["git", *a], cwd=d, check=True, capture_output=True)
            git("init", "-q")
            git("config", "user.email", "t@test.invalid")
            git("config", "user.name", "t")
            open(os.path.join(d, "a.js"), "w").write("1")
            git("add", ".")
            git("commit", "-qm", "start")
            open(os.path.join(d, "a.js"), "w").write("2")
            git("commit", "-qam", "Fix the total")
            os.makedirs(os.path.join(d, "tests"))
            open(os.path.join(d, "a.js"), "w").write("3")
            open(os.path.join(d, "tests", "a_test.mjs"), "w").write("t")
            git("add", ".")
            git("commit", "-qm", "Fix the rounding")
            old = rules_check.ROOT
            rules_check.ROOT = d
            try:
                out = rules_check.check_commits("HEAD~2..HEAD")
            finally:
                rules_check.ROOT = old
        self.assertEqual(len(out), 1)
        self.assertIn("Fix the total", out[0])


if __name__ == "__main__":
    unittest.main()
