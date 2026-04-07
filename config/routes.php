<?php

declare(strict_types=1);

return [
    'GET' => [
        '/' => ['controller' => HomeController::class, 'action' => 'index'],
        '/sql-editor' => ['controller' => HomeController::class, 'action' => 'editor'],
    ],
];
