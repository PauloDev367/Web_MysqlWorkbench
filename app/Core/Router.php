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

        if (!isset($this->routes[$httpMethod])) {
            http_response_code(404);
            echo '404 - Página não encontrada';
            return;
        }

        [$target, $params] = $this->matchRoute($this->routes[$httpMethod], $path);
        if ($target === null) {
            http_response_code(404);
            echo '404 - Página não encontrada';
            return;
        }

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

        $controller->{$action}($params);
    }

    /**
     * @param array<string, array{controller: string, action: string}> $methodRoutes
     * @return array{0: array{controller: string, action: string}|null, 1: array<string, string>}
     */
    private function matchRoute(array $methodRoutes, string $path): array
    {
        foreach ($methodRoutes as $pattern => $target) {
            if ($pattern === $path) {
                return [$target, []];
            }

            $regex = preg_replace('/\{([a-zA-Z0-9_]+)\}/', '(?P<$1>[^/]+)', $pattern);
            if (!is_string($regex)) {
                continue;
            }

            $regex = '#^' . $regex . '$#';
            if (!preg_match($regex, $path, $matches)) {
                continue;
            }

            $params = [];
            foreach ($matches as $key => $value) {
                if (is_string($key)) {
                    $params[$key] = $value;
                }
            }

            return [$target, $params];
        }

        return [null, []];
    }
}
