<?php

declare(strict_types=1);

final class SqlController extends Controller
{
    private ConnectionRepository $repository;
    private SchemaExplorerService $schemaService;
    private SqlExecutionService $sqlExecutionService;

    public function __construct()
    {
        $this->repository = new ConnectionRepository();
        $mySqlService = new MySqlConnectionService();
        $this->schemaService = new SchemaExplorerService($mySqlService);
        $this->sqlExecutionService = new SqlExecutionService($mySqlService);
    }

    /**
     * @param array<string, string> $params
     */
    public function schemas(array $params = []): void
    {
        $connectionId = (int) ($params['id'] ?? 0);
        $connection = $this->repository->find($connectionId);
        if ($connection === null) {
            $this->json(['error' => 'Conexão não encontrada.'], 404);
            return;
        }

        try {
            $schemas = $this->schemaService->listSchemas($connection);
            $this->json(['data' => $schemas]);
        } catch (Throwable $exception) {
            $this->json([
                'error' => $exception->getMessage(),
                'error_type' => $exception::class,
            ], 422);
        }
    }

    /**
     * @param array<string, string> $params
     */
    public function execute(array $params = []): void
    {
        $payload = $this->requestJson();
        $connectionId = (int) ($payload['connection_id'] ?? 0);
        $sql = (string) ($payload['sql'] ?? '');
        $activeSchema = trim((string) ($payload['active_schema'] ?? ''));

        $connection = $this->repository->find($connectionId);
        if ($connection === null) {
            $this->json(['error' => 'Conexão não encontrada.'], 404);
            return;
        }

        $result = $this->sqlExecutionService->execute($connection, $sql, $activeSchema);
        $this->json($result, $result['success'] ? 200 : 422);
    }

    /**
     * @return array<string, mixed>
     */
    private function requestJson(): array
    {
        $rawBody = file_get_contents('php://input');
        if (!is_string($rawBody) || trim($rawBody) === '') {
            return [];
        }

        $decoded = json_decode($rawBody, true);
        return is_array($decoded) ? $decoded : [];
    }
}
