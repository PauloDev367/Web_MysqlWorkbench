<?php

declare(strict_types=1);

final class ConnectionRepository
{
    public function __construct(private PDO $pdo)
    {
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function all(): array
    {
        $stmt = $this->pdo->query(
            'SELECT id, name, host, port, username, default_schema, created_at, updated_at
             FROM connections
             ORDER BY name ASC'
        );

        return $stmt->fetchAll();
    }

    /**
     * @return array<string, mixed>|null
     */
    public function find(int $id): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT id, name, host, port, username, password_encrypted, default_schema, created_at, updated_at
             FROM connections
             WHERE id = :id
             LIMIT 1'
        );
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();

        return is_array($row) ? $row : null;
    }

    /**
     * @param array<string, string> $data
     */
    public function create(array $data): int
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO connections (name, host, port, username, password_encrypted, default_schema, created_at, updated_at)
             VALUES (:name, :host, :port, :username, :password_encrypted, :default_schema, :created_at, :updated_at)'
        );

        $now = date('c');
        $stmt->execute([
            'name' => $data['name'],
            'host' => $data['host'],
            'port' => (int) $data['port'],
            'username' => $data['username'],
            'password_encrypted' => $data['password_encrypted'],
            'default_schema' => $data['default_schema'],
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        return (int) $this->pdo->lastInsertId();
    }
}
