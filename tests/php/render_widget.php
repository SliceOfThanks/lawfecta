<?php
// Renders a real DELA widget the way BD would, with stand-ins for BD's login check and database.
// php tests/php/render_widget.php <DELA-App|DELA-Admin> <member id or 0 for logged out> <BD plan id> <secret> <api address> <code path>
define('DELA_BD_SECRET', $argv[4]);
class user { public static function isUserLogged($c) { return isset($c['userid']) && $c['userid'] !== '0'; } }
function mysql($db, $q) { return 'res'; }
function mysql_fetch_assoc($r) { return array('subscription_id' => $GLOBALS['plan'], 'first_name' => 'Member', 'last_name' => $GLOBALS['uid'], 'email' => 'm' . $GLOBALS['uid'] . '@test.invalid'); }
function widget($name, $a, $b, $w) { include __DIR__ . '/../../widgets/' . $name . '.php'; }
$GLOBALS['uid'] = $argv[2];
$GLOBALS['plan'] = $argv[3];
if ($argv[2] !== '0') { $_COOKIE['userid'] = $argv[2]; }
$w = array('database' => 'bd_db', 'website_id' => 1);
ob_start();
include __DIR__ . '/../../widgets/' . $argv[1] . '.php';
$html = ob_get_clean();
$html = str_replace('PASTE_LIVE_API_ADDRESS', $argv[5], $html);
$html = str_replace('PASTE_GITHUB_OWNER/lawfecta-dela', $argv[6], $html);
echo $html;
