<?php

declare(strict_types=1);

final class ConnectionController extends Controller
{
    private ConnectionRepository $repository;
    private MySqlConnectionService $mySqlService;

    public function __construct()
    {
        $this->repository = new ConnectionRepository(Database::connection());
        $this->mySqlService = new MySqlConnectionService();
    }

    /**
     * @param array<string, string> $params
     */
    public function index(array $params = []): void
    {
        $this->json(['data' => $this->repository->all()]);
    }

    /**
     * @param array<string, string> $params
     */
    public function store(array $params = []): void
    {
        $payload = $this->requestJson();
        $name = trim((string) ($payload['name'] ?? ''));
        $host = trim((string) ($payload['host'] ?? '127.0.0.1'));
        $port = (int) ($payload['port'] ?? 3306);
        $username = trim((string) ($payload['user'] ?? 'root'));
        $password = (string) ($payload['password'] ?? '');
        $schema = trim((string) ($payload['schema'] ?? ''));

        if ($name === '' || $host === '' || $username === '') {
            $this->json(['error' => 'Campos obrigatórios inválidos.'], 422);
            return;
        }

        try {
            $id = $this->repository->create([
                'name' => $name,
                'host' => $host,
                'port' => (string) $port,
                'username' => $username,
                'password_encrypted' => Crypto::encrypt($password),
                'default_schema' => $schema,
            ]);
        } catch (Throwable $exception) {
            $this->json(['error' => 'Falha ao salvar conexão: ' . $exception->getMessage()], 422);
            return;
        }

        $row = $this->repository->find($id);
        if ($row === null) {
            $this->json(['error' => 'Conexão criada, mas não localizada.'], 500);
            return;
        }

        unset($row['password_encrypted']);
        $this->json(['data' => $row], 201);
    }

    /**
     * @param array<string, string> $params
     */
    public function test(array $params = []): void
    {
        $id = (int) ($params['id'] ?? 0);
        if ($id <= 0) {
            $this->json(['error' => 'ID da conexão inválido.'], 422);
            return;
        }

        $connection = $this->repository->find($id);
        if ($connection === null) {
            $this->json(['error' => 'Conexão não encontrada.'], 404);
            return;
        }

        $result = $this->mySqlService->testConnection($connection);
        $this->json($result, $result['success'] ? 200 : 422);
    }

    /**
     * @param array<string, string> $params
     */
    public function testTemporary(array $params = []): void
    {
        $payload = $this->requestJson();
        $connection = [
            'host' => trim((string) ($payload['host'] ?? '127.0.0.1')),
            'port' => (int) ($payload['port'] ?? 3306),
            'username' => trim((string) ($payload['user'] ?? 'root')),
            'default_schema' => trim((string) ($payload['schema'] ?? '')),
            'password_encrypted' => Crypto::encrypt((string) ($payload['password'] ?? '')),
        ];

        if ($connection['host'] === '' || $connection['username'] === '') {
            $this->json(['error' => 'Host e usuário são obrigatórios.'], 422);
            return;
        }

        $result = $this->mySqlService->testConnection($connection);
        $this->json($result, $result['success'] ? 200 : 422);
    }

    /**
     * @param array<string, string> $params
     */
    public function destroy(array $params = []): void
    {
        $id = (int) ($params['id'] ?? 0);
        if ($id <= 0) {
            $this->json(['error' => 'ID da conexão inválido.'], 422);
            return;
        }

        $deleted = $this->repository->delete($id);
        if (!$deleted) {
            $this->json(['error' => 'Conexão não encontrada.'], 404);
            return;
        }

        $this->json(['success' => true, 'message' => 'Conexão removida com sucesso.']);
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
