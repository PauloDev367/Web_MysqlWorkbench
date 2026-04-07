<?php

declare(strict_types=1);

final class Router
{
    /**
     * @param array<string, array<string, array{controller: string, action: string}>> $routes
     */
    public function __construct(private array $routes)
    {
    }

    public function dispatch(string $uri, string $method): void
    {
        $path = parse_url($uri, PHP_URL_PATH) ?: '/';
        $httpMethod = strtoupper($method);

        if (!isset($this->routes[$httpMethod][$path])) {
            http_response_code(404);
            echo '404 - Página não encontrada';
            return;
        }

        $target = $this->routes[$httpMethod][$path];
        $controllerName = $target['controller'];
        $action = $target['action'];

        if (!class_exists($controllerName)) {
            http_response_code(500);
            echo 'Controller não encontrado.';
            return;
        }

        $controller = new $controllerName();

        if (!method_exists($controller, $action)) {
            http_response_code(500);
            echo 'Ação não encontrada.';
            return;
        }

        $controller->{$action}();
    }
}
