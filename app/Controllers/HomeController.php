<?php

declare(strict_types=1);

final class HomeController extends Controller
{
    public function index(): void
    {
        $this->render('home/welcome', [
            'title' => 'Web SQL Workbench',
        ]);
    }

    public function editor(): void
    {
        $connection = trim((string) ($_GET['connection'] ?? 'Localhost'));

        $this->render('home/editor', [
            'title' => 'SQL Editor - ' . $connection,
            'connection' => $connection,
        ]);
    }
}
