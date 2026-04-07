<?php

declare(strict_types=1);

final class MySqlConnectionService
{
    /**
     * @param array<string, mixed> $connection
     */
    public function testConnection(array $connection): array
    {
        $host = (string) ($connection['host'] ?? '');
        $port = (int) ($connection['port'] ?? 3306);
        $username = (string) ($connection['username'] ?? '');
        $schema = (string) ($connection['default_schema'] ?? '');
        $passwordEncrypted = (string) ($connection['password_encrypted'] ?? '');
        $password = Crypto::decrypt($passwordEncrypted);

        $dsn = 'mysql:host=' . $host . ';port=' . $port . ';charset=utf8mb4';
        if ($schema !== '') {
            $dsn .= ';dbname=' . $schema;
        }

        try {
            $pdo = new PDO($dsn, $username, $password, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_TIMEOUT => 5,
            ]);

            $pdo->query('SELECT 1');

            return [
                'success' => true,
                'message' => 'Conexão realizada com sucesso.',
            ];
        } catch (Throwable $exception) {
            return [
                'success' => false,
                'message' => $exception->getMessage(),
            ];
        }
    }
}
