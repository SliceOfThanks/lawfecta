<?php
/*
  DELA-Auth (helper widget). Never place this widget on a page.
  DELA-App and DELA-Admin load it to prove who the logged-in member is.
  It checks BD's own login on the server, then signs a one-use pass that lasts 10 minutes,
  with the member ID, BD plan ID, name, email and sign up date. Supabase keeps the same secret as BD_SHARED_SECRET.
  Put your secret on the line below. Use letters and numbers only, at least 32 characters.
  Version 1.0.0
*/
if (!defined('DELA_BD_SECRET')) {
  define('DELA_BD_SECRET', 'PASTE_YOUR_DELA_SECRET_HERE');
}

if (!function_exists('dela_b64url')) {
  function dela_b64url($s) {
    return rtrim(strtr(base64_encode($s), '+/', '-_'), '=');
  }
}

if (!function_exists('dela_db_name')) {
  function dela_db_name($w) {
    if (is_array($w) && isset($w['database']) && $w['database'] != '') { return $w['database']; }
    if (isset($GLOBALS['w']) && is_array($GLOBALS['w']) && isset($GLOBALS['w']['database'])) { return $GLOBALS['w']['database']; }
    return '';
  }
}

if (!function_exists('dela_secret_ok')) {
  function dela_secret_ok() {
    return strlen(DELA_BD_SECRET) >= 32 && strpos(DELA_BD_SECRET, 'PASTE_') !== 0;
  }
}

if (!function_exists('dela_pass')) {
  function dela_pass($w) {
    if (!dela_secret_ok()) { return ''; }
    if (!class_exists('user') || !isset($_COOKIE['userid'])) { return ''; }
    if (!user::isUserLogged($_COOKIE)) { return ''; }
    $uid = (int) $_COOKIE['userid'];
    if ($uid <= 0) { return ''; }
    $sub = '';
    $name = '';
    $email = '';
    $jn = '';
    $dbn = dela_db_name($w);
    if ($dbn != '' && function_exists('mysql') && function_exists('mysql_fetch_assoc')) {
      $res = mysql($dbn, 'SELECT * FROM users_data WHERE user_id=' . $uid . ' LIMIT 1');
      if ($res) {
        $row = mysql_fetch_assoc($res);
        if ($row) {
          $sub = (string) (int) $row['subscription_id'];
          $name = trim($row['first_name'] . ' ' . $row['last_name']);
          if (isset($row['email'])) { $email = trim((string) $row['email']); }
          if (isset($row['signup_date']) && $row['signup_date'] != '') {
            $t = strtotime($row['signup_date']);
            if ($t) { $jn = date('c', $t); }
          }
        }
      }
    }
    $now = time();
    $payload = json_encode(array(
      'aud' => 'dela', 'uid' => $uid, 'sub' => $sub, 'name' => $name, 'email' => $email, 'jn' => $jn,
      'jti' => bin2hex(random_bytes(16)), 'iat' => $now, 'exp' => $now + 600
    ), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    $body = dela_b64url($payload);
    return $body . '.' . hash_hmac('sha256', $body, DELA_BD_SECRET);
  }
}

if (!function_exists('dela_why')) {
  function dela_why($w, $pass) {
    $why = array();
    if (!function_exists('dela_pass')) { $why[] = 'auth_not_loaded'; }
    if (!dela_secret_ok()) { $why[] = 'secret_not_set'; }
    if (!class_exists('user')) { $why[] = 'no_user_class'; }
    if (!isset($_COOKIE['userid'])) { $why[] = 'no_userid_cookie'; }
    if (dela_db_name($w) == '') { $why[] = 'no_db'; }
    $why[] = ($pass == '' ? 'empty_pass' : 'pass_ok');
    return implode(',', $why);
  }
}
?>
