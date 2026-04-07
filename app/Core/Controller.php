<?php

declare(strict_types=1);

abstract class Controller
{
    /**
     * @param array<string, mixed> $data
     */
    protected function render(string $view, array $data = [], string $layout = 'main'): void
    {
        View::render($view, $data, $layout);
    }
}
