<?php
// Runs the real DELA-Auth widget code with stand-ins for BD, and prints the pass it makes.
// php tests/php/make_pass.php <secret> <logged 0|1>
define('DELA_BD_SECRET', $argv[1]);
class user { public static function isUserLogged($c) { return $GLOBALS['logged']; } }
function mysql($db, $q) { return 'res'; }
function mysql_fetch_assoc($r) { return array('subscription_id' => '31', 'first_name' => 'Test', 'last_name' => "O'Brien", 'email' => 'test@lawfecta.invalid', 'signup_date' => '2026-10-20 09:30:00'); }
$GLOBALS['logged'] = $argv[2] === '1';
$_COOKIE['userid'] = '4242';
require __DIR__ . '/../../widgets/DELA-Auth.php';
$w = array('database' => 'bd_db');
$p = dela_pass($w);
echo json_encode(array('pass' => $p, 'why' => dela_why($w, $p)));
