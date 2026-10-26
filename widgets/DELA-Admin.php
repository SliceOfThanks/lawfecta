<?php
/* DELA-Admin: the DELA admin area for the Lawfecta Team. Place this widget on the /dela-admin page. Version 1.0.0
   data-api is the DELA Live api address. data-code is the GitHub home of the DELA code.
   Test accounts on the staging list are sent to the Staging copy automatically. */
$dela_pass = '';
$dela_why = 'auth_not_loaded';
if (function_exists('widget')) {
  $dela_lvl = ob_get_level();
  try {
    ob_start();
    widget('DELA-Auth', '', isset($w['website_id']) ? $w['website_id'] : 0, isset($w) ? $w : array());
    ob_get_clean();
  } catch (Throwable $dela_e) {
    while (ob_get_level() > $dela_lvl) { ob_end_clean(); }
  }
}
if (function_exists('dela_pass')) {
  $dela_pass = dela_pass(isset($w) ? $w : array());
  $dela_why = dela_why(isset($w) ? $w : array(), $dela_pass);
}
?>
<div id="dela-app" data-mode="admin" data-api="PASTE_LIVE_API_ADDRESS" data-code="PASTE_GITHUB_OWNER/lawfecta-dela" data-login-url="/login" data-pass="<?php echo htmlspecialchars($dela_pass, ENT_QUOTES); ?>" data-why="<?php echo htmlspecialchars($dela_why, ENT_QUOTES); ?>"><p style="text-align:center;padding:40px 16px;font-family:Arial,sans-serif;color:#1f2a37">Loading DELA...</p></div>
<script>
(function () {
  var root = document.getElementById('dela-app');
  if (!root || root.getAttribute('data-started')) { return; }
  root.setAttribute('data-started', '1');
  var api = root.getAttribute('data-api');
  var pass = root.getAttribute('data-pass') || '';
  var why = root.getAttribute('data-why') || '';
  var code = root.getAttribute('data-code');
  var mode = root.getAttribute('data-mode');
  root.removeAttribute('data-pass');
  function post(base) {
    return fetch(base + '/bootstrap', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ pass: pass, why: why }) }).then(function (r) { return r.json(); });
  }
  function add(src, done) {
    var s = document.createElement('script');
    s.src = src;
    s.onload = done;
    s.onerror = fail;
    document.body.appendChild(s);
  }
  function fail() {
    root.innerHTML = '<p style="text-align:center;padding:40px 16px;font-family:Arial,sans-serif;color:#1f2a37">DELA could not load. Please refresh the page.</p>';
  }
  function load(base, boot) {
    var cdn = 'https://cdn.jsdelivr.net/gh/' + code + '@' + (boot.commit || 'main');
    root.setAttribute('data-api', base);
    root.setAttribute('data-base', cdn);
    root.delaBoot = boot;
    add(cdn + '/shared/dela-core.js', function () { add(cdn + (mode === 'admin' ? '/admin/dela-admin.js' : '/app/dela-app.js')); });
  }
  post(api).then(function (b) {
    if (b.route === 'staging' && b.api) { return post(b.api).then(function (b2) { b2.staging = true; load(b.api, b2); }); }
    load(api, b);
  }).catch(fail);
})();
</script>
