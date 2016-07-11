<?php

/**
 * Load services definition file.
 */
$settings['container_yamls'][] = __DIR__ . '/services.yml';

$config_directories[CONFIG_SYNC_DIRECTORY] = __DIR__ . '/config';
/**
 * Include the Platform-specific settings file.
 *
 * n.b. The settings.platform.php file makes some changes
 *      that affect all envrionments that this site
 *      exists in.  Always include this file, even in
 *      a local development environment, to insure that
 *      the site settings remain consistent.
 */
include __DIR__ . "/settings.platform.php";

$pdate_free_access = FALSE;

 $drupal_hash_salt = '5vNH-JwuKOSlgzbJCL3FbXvNQNfd8Bz26SiadpFx6gE';

$local_settings = dirname(__FILE__) . '/settings.local.php';

if (file_exists($local_settings)) { 
    require_once($local_settings);
 }

$settings['install_profile'] = 'activelamp_com';
$settings['hash_salt'] = $drupal_hash_salt;
