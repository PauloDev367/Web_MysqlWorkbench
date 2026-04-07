<?php

declare(strict_types=1);

final class HomeController extends Controller
{
    /**
     * @param array<string, string> $params
     */
    public function index(array $params = []): void
    {
        $this->render('home/welcome', [
            'title' => 'Web SQL Workbench',
        ]);
    }

    /**
     * @param array<string, string> $params
     */
    public function editor(array $params = []): void
    {
        $connectionName = trim((string) ($_GET['connection'] ?? 'Localhost'));
        $connectionId = (int) ($_GET['connection_id'] ?? 0);

        $this->render('home/editor', [
            'title' => 'SQL Editor - ' . $connectionName,
            'connection' => $connectionName,
            'connectionId' => $connectionId,
        ]);
    }
}
