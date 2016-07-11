<?php

if (!getenv('PLATFORM_ENVIRONMENT')) {
    return;
}

$relationships = json_decode(base64_decode(getenv('PLATFORM_RELATIONSHIPS')), true);


$config_directories[CONFIG_SYNC_DIRECTORY] = __DIR__ . '/config';

$database_creds = $relationships['database'][0];

$databases['default']['default'] = [
    'database' => $database_creds['path'],
    'username' => $database_creds['username'],
    'password' => $database_creds['password'],
    'host' => $database_creds['host'],
    'port' => $database_creds['port'],
    'driver' => 'mysql',
    'prefix' => '',
    'collation' => 'utf8mb4_general_ci',
];
