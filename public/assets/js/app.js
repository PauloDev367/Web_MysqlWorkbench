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
        const menubar = document.querySelector('.wb-menubar[data-connection-id]');
        const sqlEditor = document.getElementById('sqlEditor');
        const runSelectedBtn = document.getElementById('runSelectedBtn');
        const runAllBtn = document.getElementById('runAllBtn');
        const outputRows = document.getElementById('actionOutputRows');
        const schemaTree = document.getElementById('schemaTree');
        const resultGridHead = document.getElementById('resultGridHead');
        const resultGridRows = document.getElementById('resultGridRows');

        if (!menubar || !sqlEditor || !runSelectedBtn || !runAllBtn || !outputRows || !schemaTree || !resultGridHead || !resultGridRows) {
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

        const connectionId = Number(menubar.getAttribute('data-connection-id') || '0');
        if (!connectionId) {
            appendOutput('Connection', 'Conexão inválida para carregar schemas.');
            return;
        }

        const renderResultGrid = (columns, rows) => {
            if (!columns.length || !rows.length) {
                resultGridHead.innerHTML = '';
                resultGridRows.innerHTML = '<tr><td>Nenhum resultado.</td></tr>';
                return;
            }

            resultGridHead.innerHTML = `<tr>${columns.map((column) => `<th>${column}</th>`).join('')}</tr>`;
            resultGridRows.innerHTML = rows.map((row) => `
                <tr>${columns.map((column) => `<td>${row[column] ?? ''}</td>`).join('')}</tr>
            `).join('');
        };

        const executeSql = async (action, sql) => {
            const response = await fetch('/api/sql/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ connection_id: connectionId, sql }),
            });

            const payload = await parseResponse(response);
            renderResultGrid(payload.columns || [], payload.rows || []);
            appendOutput(action, `${payload.message} (${payload.duration_ms} ms)`);
        };

        const renderSchemas = async () => {
            const response = await fetch(`/api/connections/${connectionId}/schemas`);
            const payload = await parseResponse(response);
            const schemas = Array.isArray(payload.data) ? payload.data : [];
            if (!schemas.length) {
                schemaTree.innerHTML = '<li>Nenhum schema encontrado.</li>';
                return;
            }

            schemaTree.innerHTML = schemas.map((schema) => `
                <li>
                    <details open>
                        <summary>${schema.name}</summary>
                        <ul>
                            <li>
                                <details open>
                                    <summary>Tables</summary>
                                    <ul>
                                        ${(schema.tables || []).map((table) => `<li>${table}</li>`).join('')}
                                    </ul>
                                </details>
                            </li>
                        </ul>
                    </details>
                </li>
            `).join('');
        };

        runSelectedBtn.addEventListener('click', async () => {
            const start = sqlEditor.selectionStart;
            const end = sqlEditor.selectionEnd;
            const selectedSql = sqlEditor.value.slice(start, end).trim();

            if (!selectedSql) {
                appendOutput('Execute Selected', 'Nenhum trecho SQL foi selecionado.');
                return;
            }

            try {
                await executeSql('Execute Selected', selectedSql);
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Falha ao executar SQL selecionado.';
                appendOutput('Execute Selected', message);
            }
        });

        runAllBtn.addEventListener('click', async () => {
            const sql = sqlEditor.value.trim();
            if (!sql) {
                appendOutput('Execute All', 'Editor vazio.');
                return;
            }

            try {
                await executeSql('Execute All', sql);
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Falha ao executar SQL.';
                appendOutput('Execute All', message);
            }
        });

        renderSchemas().catch((error) => {
            const message = error instanceof Error ? error.message : 'Falha ao carregar schemas.';
            appendOutput('Load Schemas', message);
        });
    };

    setupWelcomeScreen();
    setupEditorScreen();
})();
