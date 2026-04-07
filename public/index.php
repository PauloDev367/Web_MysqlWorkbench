<?php

declare(strict_types=1);

$basePath = dirname(__DIR__);

require $basePath . '/app/Core/Router.php';
require $basePath . '/app/Core/Controller.php';
require $basePath . '/app/Core/View.php';
require $basePath . '/app/Core/Database.php';
require $basePath . '/app/Core/Crypto.php';
require $basePath . '/app/Controllers/HomeController.php';
require $basePath . '/app/Controllers/ConnectionController.php';
require $basePath . '/app/Controllers/SqlController.php';
require $basePath . '/app/Repositories/ConnectionRepository.php';
require $basePath . '/app/Services/MySqlConnectionService.php';
require $basePath . '/app/Services/SchemaExplorerService.php';
require $basePath . '/app/Services/SqlExecutionService.php';

$routes = require $basePath . '/config/routes.php';

$router = new Router($routes);
$router->dispatch($_SERVER['REQUEST_URI'] ?? '/', $_SERVER['REQUEST_METHOD'] ?? 'GET');
