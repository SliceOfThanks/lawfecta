<?php
/* DELA-Security: the public security page. Place this widget on the /security page. Version 1.0.0
   Anyone can open it: it needs no login and never reads who is signed in.
   data-api-staging is the DELA Staging api address (the test site, hirelegalhelp.com).
   data-api stays empty on the test site. On lawfecta.com it holds the Live api address.
   data-code is the GitHub home of the DELA code. */
?>
<div id="dela-security" data-api="" data-api-staging="https://ojshgsxgsypbywtqhkch.supabase.co/functions/v1/api" data-code="SliceOfThanks/lawfecta"><p style="text-align:center;padding:40px 16px;font-family:Arial,sans-serif;color:#1f2a37">Loading the security page...</p></div>
<script>
(function () {
  var root = document.getElementById('dela-security');
  if (!root || root.getAttribute('data-started')) { return; }
  root.setAttribute('data-started', '1');
  var api = root.getAttribute('data-api') || root.getAttribute('data-api-staging');
  var code = root.getAttribute('data-code');
  function fail() {
    root.innerHTML = '<p style="text-align:center;padding:40px 16px;font-family:Arial,sans-serif;color:#1f2a37">The security page could not load. Please refresh the page.</p>';
  }
  function add(src, done) {
    var s = document.createElement('script');
    s.src = src;
    s.onload = done;
    s.onerror = fail;
    document.body.appendChild(s);
  }
  // The api names the tested code version, so this page loads the same release as the member app
  fetch(api + '/bootstrap', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ pass: '', why: '' }) })
    .then(function (r) { return r.json(); })
    .then(function (b) {
      if (!b || !b.commit) { fail(); return; }
      var cdn = 'https://cdn.jsdelivr.net/gh/' + code + '@' + b.commit;
      root.setAttribute('data-api', api);
      root.setAttribute('data-base', cdn);
      add(cdn + '/shared/dela-core.js', function () { add(cdn + '/app/dela-security.js'); });
    })
    .catch(fail);
})();
</script>
