# MySQL Webbench

Aplicação web em PHP 8.3 (sem frameworks) inspirada no MySQL Workbench, com foco em operações básicas de conexão, navegação de schemas e execução SQL.

## Visão Geral

O projeto implementa:
- tela inicial de conexões (estilo Workbench);
- criação, teste e remoção de conexões;
- editor SQL com abas;
- execução de SQL selecionado ou completo;
- explorer lateral de banco com `Tables`, `Views`, `Stored Procedures` e `Functions`;
- painel `Action Output` e `Result Grid`;
- menu superior com ações básicas (`File`, `Edit`, `View`, `Query`, etc);
- dashboard de performance na Home com teste de saúde das conexões.

## Stack

- PHP 8.3
- JavaScript vanilla
- CSS vanilla
- PDO MySQL para conexão com o banco alvo
- Armazenamento local de conexões em JSON (`storage/database/connections.json`)

## Arquitetura

Projeto estruturado em MVC:

- `public/` - ponto de entrada e assets
- `app/Controllers/` - controllers HTTP
- `app/Services/` - regras de negócio (execução SQL, exploração de schema)
- `app/Repositories/` - persistência de conexões
- `app/Views/` - páginas e layout
- `config/routes.php` - rotas da aplicação

## Funcionalidades principais

### Home
- lista de conexões salvas;
- modal de nova conexão;
- teste de conexão;
- remoção de conexão;
- sidebar funcional (overview/connections/performance/migration);
- performance dashboard com:
  - total online/offline,
  - latência média,
  - tabela por conexão.

### Editor SQL
- abrir conexão e carregar explorer lateral;
- selecionar schema por duplo clique (equivalente a `USE schema`);
- abas com fechar por `x` e clique do botão do meio;
- abrir arquivo `.sql`;
- salvar script da aba atual;
- `Ctrl+Enter`: executa seleção, ou tudo se não houver seleção;
- destaque de sintaxe SQL no editor.

## Como executar o projeto

Na raiz do projeto:

```bash
cd public
php -S localhost:8000
```

Acesse:

- Home: [http://localhost:8000](http://localhost:8000)
- Editor: aberto ao clicar em uma conexão

## Configuração de ambiente

### Variáveis de ambiente opcionais

O projeto usa `APP_KEY` para criptografia de senha das conexões.  
Se não definida, usa chave padrão (recomendado definir em produção).

Exemplo:

```bash
export APP_KEY="troque-por-uma-chave-segura"
```

## API (resumo)

- `GET /api/connections` - listar conexões
- `POST /api/connections` - criar conexão
- `DELETE /api/connections/{id}` - remover conexão
- `POST /api/connections/{id}/test` - testar conexão salva
- `POST /api/connections/test-temporary` - testar conexão do modal sem salvar
- `GET /api/connections/{id}/schemas` - listar schemas e objetos
- `POST /api/sql/execute` - executar SQL

## Observações

- Arquivo de conexões salvo em: `storage/database/connections.json`
- Senhas das conexões são criptografadas antes de persistir
- Projeto não usa framework frontend/backend

---

## Instalação do PHP e pacotes no Linux (Ubuntu/Debian)

### 1) Atualizar pacotes

```bash
sudo apt update
```

### 2) Instalar PHP 8.3 + extensões necessárias

```bash
sudo apt install -y php8.3 php8.3-cli php8.3-common php8.3-mysql php8.3-mbstring php8.3-xml php8.3-curl php8.3-zip
```

### 3) Verificar instalação

```bash
php -v
php -m | rg "PDO|pdo_mysql|openssl"
```

> Se `rg` não estiver instalado, use:
> ```bash
> php -m
> ```

## Subir MySQL com Docker

### 1) Criar container

```bash
docker run -d \
  --name mysql-webbench \
  -e MYSQL_ROOT_PASSWORD=root \
  -e MYSQL_DATABASE=app_db \
  -p 3306:3306 \
  mysql:8.0
```

### 2) Verificar logs até ficar pronto

```bash
docker logs -f mysql-webbench
```

### 3) Testar conexão no app

Use no modal:
- Hostname: `127.0.0.1`
- Port: `3306`
- Username: `root`
- Password: `root`
- Default Schema: `app_db` (opcional)

### 4) Comandos úteis do container

```bash
docker start mysql-webbench
docker stop mysql-webbench
docker rm -f mysql-webbench
```
