<?php

declare(strict_types=1);

return [
    'GET' => [
        '/' => ['controller' => HomeController::class, 'action' => 'index'],
        '/sql-editor' => ['controller' => HomeController::class, 'action' => 'editor'],
        '/api/connections' => ['controller' => ConnectionController::class, 'action' => 'index'],
        '/api/connections/{id}/schemas' => ['controller' => SqlController::class, 'action' => 'schemas'],
    ],
    'POST' => [
        '/api/connections' => ['controller' => ConnectionController::class, 'action' => 'store'],
        '/api/connections/{id}/test' => ['controller' => ConnectionController::class, 'action' => 'test'],
        '/api/connections/test-temporary' => ['controller' => ConnectionController::class, 'action' => 'testTemporary'],
        '/api/sql/execute' => ['controller' => SqlController::class, 'action' => 'execute'],
    ],
];
