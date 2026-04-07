<?php

declare(strict_types=1);

final class ConnectionRepository
{
    private string $storagePath;

    public function __construct()
    {
        $basePath = dirname(__DIR__, 2);
        $storageDir = $basePath . '/storage/database';
        $this->storagePath = $storageDir . '/connections.json';

        if (!is_dir($storageDir)) {
            mkdir($storageDir, 0775, true);
        }

        if (!file_exists($this->storagePath)) {
            file_put_contents($this->storagePath, json_encode([]));
        }
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function all(): array
    {
        $rows = $this->readAll();
        usort(
            $rows,
            static fn (array $a, array $b): int => strcmp((string) $a['name'], (string) $b['name'])
        );

        return array_map(function (array $row): array {
            unset($row['password_encrypted']);
            return $row;
        }, $rows);
    }

    /**
     * @return array<string, mixed>|null
     */
    public function find(int $id): ?array
    {
        $rows = $this->readAll();
        foreach ($rows as $row) {
            if ((int) $row['id'] === $id) {
                return $row;
            }
        }

        return null;
    }

    /**
     * @param array<string, string> $data
     */
    public function create(array $data): int
    {
        $rows = $this->readAll();
        foreach ($rows as $row) {
            if (mb_strtolower((string) $row['name']) === mb_strtolower((string) $data['name'])) {
                throw new RuntimeException('Já existe uma conexão com este nome.');
            }
        }

        $newId = $this->nextId($rows);
        $now = date('c');
        $rows[] = [
            'id' => $newId,
            'name' => $data['name'],
            'host' => $data['host'],
            'port' => (int) $data['port'],
            'username' => $data['username'],
            'password_encrypted' => $data['password_encrypted'],
            'default_schema' => $data['default_schema'],
            'created_at' => $now,
            'updated_at' => $now,
        ];

        $this->writeAll($rows);
        return $newId;
    }

    public function delete(int $id): bool
    {
        $rows = $this->readAll();
        $filtered = array_values(array_filter($rows, static fn (array $row): bool => (int) $row['id'] !== $id));
        if (count($filtered) === count($rows)) {
            return false;
        }

        $this->writeAll($filtered);
        return true;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function readAll(): array
    {
        $raw = file_get_contents($this->storagePath);
        if (!is_string($raw) || trim($raw) === '') {
            return [];
        }

        $decoded = json_decode($raw, true);
        return is_array($decoded) ? $decoded : [];
    }

    /**
     * @param array<int, array<string, mixed>> $rows
     */
    private function writeAll(array $rows): void
    {
        file_put_contents($this->storagePath, json_encode($rows, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
    }

    /**
     * @param array<int, array<string, mixed>> $rows
     */
    private function nextId(array $rows): int
    {
        $maxId = 0;
        foreach ($rows as $row) {
            $maxId = max($maxId, (int) ($row['id'] ?? 0));
        }

        return $maxId + 1;
    }
}
