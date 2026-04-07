(() => {
    const parseResponse = async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(payload.error || 'Erro ao processar requisição.');
        }

        return payload;
    };

    const setupWelcomeScreen = () => {
        const grid = document.getElementById('connectionsGrid');
        const newConnectionBtn = document.getElementById('newConnectionBtn');
        const modal = document.getElementById('connectionModal');
        const form = document.getElementById('connectionForm');
        const testConnectionBtn = document.getElementById('testConnectionBtn');

        if (!grid || !newConnectionBtn || !modal || !form || !testConnectionBtn) {
            return;
        }

        const closeModalEls = modal.querySelectorAll('[data-close-modal]');

        const openModal = () => {
            modal.classList.remove('wb-modal--hidden');
            modal.setAttribute('aria-hidden', 'false');
        };

        const closeModal = () => {
            modal.classList.add('wb-modal--hidden');
            modal.setAttribute('aria-hidden', 'true');
        };

        const renderConnections = async () => {
            const response = await fetch('/api/connections');
            const payload = await parseResponse(response);
            const connections = Array.isArray(payload.data) ? payload.data : [];

            grid.innerHTML = connections.map((conn) => `
                <article class="wb-conn-card" data-connection-id="${conn.id}" data-connection-name="${conn.name}">
                    <h3>${conn.name}</h3>
                    <p>${conn.username}</p>
                    <p>${conn.host}:${conn.port}</p>
                </article>
            `).join('');

            grid.querySelectorAll('.wb-conn-card').forEach((card) => {
                card.addEventListener('click', () => {
                    const connectionId = card.getAttribute('data-connection-id') || '0';
                    const connectionName = card.getAttribute('data-connection-name') || 'Localhost';
                    window.location.href = `/sql-editor?connection_id=${encodeURIComponent(connectionId)}&connection=${encodeURIComponent(connectionName)}`;
                });
            });
        };

        newConnectionBtn.addEventListener('click', openModal);
        closeModalEls.forEach((element) => element.addEventListener('click', closeModal));

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            const formData = new FormData(form);
            const newConnection = {
                name: String(formData.get('name') || '').trim(),
                host: String(formData.get('host') || '127.0.0.1').trim(),
                port: String(formData.get('port') || '3306').trim(),
                user: String(formData.get('user') || 'root').trim(),
                password: String(formData.get('password') || ''),
                schema: String(formData.get('schema') || '').trim(),
            };

            if (!newConnection.name) {
                alert('Informe o nome da conexão.');
                return;
            }

            try {
                const response = await fetch('/api/connections', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newConnection),
                });
                await parseResponse(response);
                await renderConnections();
                closeModal();
                form.reset();
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Falha ao criar conexão.';
                alert(message);
            }
        });

        testConnectionBtn.addEventListener('click', async () => {
            const formData = new FormData(form);
            const testPayload = {
                name: String(formData.get('name') || 'Teste').trim() || 'Teste',
                host: String(formData.get('host') || '127.0.0.1').trim(),
                port: String(formData.get('port') || '3306').trim(),
                user: String(formData.get('user') || 'root').trim(),
                password: String(formData.get('password') || ''),
                schema: String(formData.get('schema') || '').trim(),
            };

            try {
                const testResponse = await fetch('/api/connections/test-temporary', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(testPayload),
                });
                const testResult = await parseResponse(testResponse);
                alert(testResult.message || 'Conexão testada com sucesso.');
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Falha no teste de conexão.';
                alert(message);
            }
        });

        renderConnections().catch(() => {
            grid.innerHTML = '<p>Falha ao carregar conexões.</p>';
        });
    };

    const setupEditorScreen = () => {
        const sqlEditor = document.getElementById('sqlEditor');
        const runSelectedBtn = document.getElementById('runSelectedBtn');
        const runAllBtn = document.getElementById('runAllBtn');
        const outputRows = document.getElementById('actionOutputRows');

        if (!sqlEditor || !runSelectedBtn || !runAllBtn || !outputRows) {
            return;
        }

        const appendOutput = (action, message) => {
            const now = new Date();
            const time = now.toLocaleTimeString('pt-BR');
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${outputRows.children.length + 1}</td>
                <td>${time}</td>
                <td>${action}</td>
                <td>${message}</td>
                <td>${Math.floor(Math.random() * 30) + 1} ms</td>
            `;
            outputRows.prepend(row);
        };

        runSelectedBtn.addEventListener('click', () => {
            const start = sqlEditor.selectionStart;
            const end = sqlEditor.selectionEnd;
            const selectedSql = sqlEditor.value.slice(start, end).trim();

            if (!selectedSql) {
                appendOutput('Execute Selected', 'Nenhum trecho SQL foi selecionado.');
                return;
            }

            appendOutput('Execute Selected', `Execução simulada: ${selectedSql.slice(0, 60)}`);
        });

        runAllBtn.addEventListener('click', () => {
            const sql = sqlEditor.value.trim();
            if (!sql) {
                appendOutput('Execute All', 'Editor vazio.');
                return;
            }
            appendOutput('Execute All', `Execução simulada de ${sql.length} caracteres.`);
        });
    };

    setupWelcomeScreen();
    setupEditorScreen();
})();
