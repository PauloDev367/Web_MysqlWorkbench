<?php

declare(strict_types=1);

final class SchemaExplorerService
{
    public function __construct(private MySqlConnectionService $connectionService)
    {
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function listSchemas(array $connection): array
    {
        $pdo = $this->connectionService->connect($connection);
        $stmt = $pdo->query(
            "SELECT schema_name
             FROM information_schema.schemata
             WHERE schema_name NOT IN ('information_schema', 'performance_schema', 'mysql', 'sys')
             ORDER BY schema_name"
        );
        $schemas = $stmt->fetchAll(PDO::FETCH_COLUMN) ?: [];

        $result = [];
        foreach ($schemas as $schemaName) {
            $name = (string) $schemaName;
            $result[] = [
                'name' => $name,
                'tables' => $this->listTables($pdo, $name),
                'views' => $this->listViews($pdo, $name),
                'procedures' => $this->listProcedures($pdo, $name),
                'functions' => $this->listFunctions($pdo, $name),
            ];
        }

        return $result;
    }

    /**
     * @return array<int, array{name: string, columns: array<int, string>}>
     */
    private function listTables(PDO $pdo, string $schemaName): array
    {
        $stmt = $pdo->prepare(
            "SELECT table_name
             FROM information_schema.tables
             WHERE table_schema = :schemaName
               AND table_type = 'BASE TABLE'
             ORDER BY table_name"
        );
        $stmt->execute(['schemaName' => $schemaName]);
        $tables = $stmt->fetchAll(PDO::FETCH_COLUMN) ?: [];
        $result = [];

        foreach ($tables as $tableName) {
            $name = (string) $tableName;
            $result[] = [
                'name' => $name,
                'columns' => $this->listColumns($pdo, $schemaName, $name),
            ];
        }

        return $result;
    }

    /**
     * @return array<int, string>
     */
    private function listColumns(PDO $pdo, string $schemaName, string $tableName): array
    {
        $stmt = $pdo->prepare(
            "SELECT column_name
             FROM information_schema.columns
             WHERE table_schema = :schemaName
               AND table_name = :tableName
             ORDER BY ordinal_position"
        );
        $stmt->execute([
            'schemaName' => $schemaName,
            'tableName' => $tableName,
        ]);
        $columns = $stmt->fetchAll(PDO::FETCH_COLUMN);

        return array_map(static fn (mixed $value): string => (string) $value, $columns ?: []);
    }

    /**
     * @return array<int, string>
     */
    private function listViews(PDO $pdo, string $schemaName): array
    {
        $stmt = $pdo->prepare(
            "SELECT table_name
             FROM information_schema.views
             WHERE table_schema = :schemaName
             ORDER BY table_name"
        );
        $stmt->execute(['schemaName' => $schemaName]);
        $views = $stmt->fetchAll(PDO::FETCH_COLUMN);

        return array_map(static fn (mixed $value): string => (string) $value, $views ?: []);
    }

    /**
     * @return array<int, string>
     */
    private function listProcedures(PDO $pdo, string $schemaName): array
    {
        $stmt = $pdo->prepare(
            "SELECT routine_name
             FROM information_schema.routines
             WHERE routine_schema = :schemaName
               AND routine_type = 'PROCEDURE'
             ORDER BY routine_name"
        );
        $stmt->execute(['schemaName' => $schemaName]);
        $routines = $stmt->fetchAll(PDO::FETCH_COLUMN);

        return array_map(static fn (mixed $value): string => (string) $value, $routines ?: []);
    }

    /**
     * @return array<int, string>
     */
    private function listFunctions(PDO $pdo, string $schemaName): array
    {
        $stmt = $pdo->prepare(
            "SELECT routine_name
             FROM information_schema.routines
             WHERE routine_schema = :schemaName
               AND routine_type = 'FUNCTION'
             ORDER BY routine_name"
        );
        $stmt->execute(['schemaName' => $schemaName]);
        $routines = $stmt->fetchAll(PDO::FETCH_COLUMN);

        return array_map(static fn (mixed $value): string => (string) $value, $routines ?: []);
    }
}
