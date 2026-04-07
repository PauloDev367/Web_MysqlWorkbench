<?php

declare(strict_types=1);

final class SqlExecutionService
{
    public function __construct(private MySqlConnectionService $connectionService)
    {
    }

    /**
     * @param array<string, mixed> $connection
     * @return array<string, mixed>
     */
    public function execute(array $connection, string $sql, string $activeSchema = ''): array
    {
        $query = trim($sql);
        if ($query === '') {
            return [
                'success' => false,
                'message' => 'SQL vazio.',
                'columns' => [],
                'rows' => [],
                'affected_rows' => 0,
                'duration_ms' => 0,
            ];
        }

        $start = microtime(true);

        try {
            $pdo = $this->connectionService->connect($connection);
            if ($activeSchema !== '') {
                if (!preg_match('/^[a-zA-Z0-9_]+$/', $activeSchema)) {
                    throw new RuntimeException('Schema ativo inválido.');
                }
                $pdo->exec('USE `' . $activeSchema . '`');
            }
            $statement = $pdo->query($query);
            $duration = (int) round((microtime(true) - $start) * 1000);

            if ($statement === false) {
                return [
                    'success' => false,
                    'message' => 'Falha ao executar SQL.',
                    'columns' => [],
                    'rows' => [],
                    'affected_rows' => 0,
                    'duration_ms' => $duration,
                ];
            }

            $rows = $statement->fetchAll(PDO::FETCH_ASSOC);
            $columns = [];
            if (!empty($rows)) {
                $columns = array_keys($rows[0]);
            }

            return [
                'success' => true,
                'message' => 'SQL executado com sucesso.',
                'columns' => $columns,
                'rows' => $rows,
                'affected_rows' => $statement->rowCount(),
                'duration_ms' => $duration,
            ];
        } catch (Throwable $exception) {
            $duration = (int) round((microtime(true) - $start) * 1000);
            $sqlState = null;
            $driverCode = null;
            $driverMessage = null;
            if ($exception instanceof PDOException) {
                $errorInfo = $exception->errorInfo;
                if (is_array($errorInfo)) {
                    $sqlState = isset($errorInfo[0]) ? (string) $errorInfo[0] : null;
                    $driverCode = isset($errorInfo[1]) ? (string) $errorInfo[1] : null;
                    $driverMessage = isset($errorInfo[2]) ? (string) $errorInfo[2] : null;
                }
            }

            return [
                'success' => false,
                'message' => $exception->getMessage(),
                'error_type' => $exception::class,
                'sql_state' => $sqlState,
                'driver_code' => $driverCode,
                'driver_message' => $driverMessage,
                'columns' => [],
                'rows' => [],
                'affected_rows' => 0,
                'duration_ms' => $duration,
            ];
        }
    }
}
