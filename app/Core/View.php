<?php

declare(strict_types=1);

final class View
{
    /**
     * @param array<string, mixed> $data
     */
    public static function render(string $view, array $data = [], string $layout = 'main'): void
    {
        $basePath = dirname(__DIR__, 2);
        $viewPath = $basePath . '/app/Views/' . $view . '.php';
        $layoutPath = $basePath . '/app/Views/layouts/' . $layout . '.php';

        if (!file_exists($viewPath) || !file_exists($layoutPath)) {
            http_response_code(500);
            echo 'View ou layout não encontrado.';
            return;
        }

        extract($data, EXTR_SKIP);

        ob_start();
        require $viewPath;
        $content = (string) ob_get_clean();

        require $layoutPath;
    }
}
