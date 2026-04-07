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
                    <p style="margin-top:8px;">
                        <button class="wb-btn" data-action="test">Test</button>
                        <button class="wb-btn wb-btn--ghost" data-action="delete">Delete</button>
                    </p>
                </article>
            `).join('');

            grid.querySelectorAll('.wb-conn-card').forEach((card) => {
                card.addEventListener('click', (event) => {
                    const target = event.target;
                    if (!(target instanceof HTMLElement)) {
                        return;
                    }

                    const connectionId = card.getAttribute('data-connection-id') || '0';
                    const action = target.getAttribute('data-action');
                    if (action === 'delete') {
                        event.stopPropagation();
                        fetch(`/api/connections/${connectionId}`, { method: 'DELETE' })
                            .then(parseResponse)
                            .then(() => renderConnections())
                            .catch((error) => {
                                const message = error instanceof Error ? error.message : 'Falha ao excluir conexão.';
                                alert(message);
                            });
                        return;
                    }

                    if (action === 'test') {
                        event.stopPropagation();
                        fetch(`/api/connections/${connectionId}/test`, { method: 'POST' })
                            .then(parseResponse)
                            .then((result) => {
                                alert(result.message || 'Conexão testada.');
                            })
                            .catch((error) => {
                                const message = error instanceof Error ? error.message : 'Falha ao testar conexão.';
                                alert(message);
                            });
                        return;
                    }

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
        const editorLayout = document.querySelector('.wb-editor-layout');
        const navPanel = document.querySelector('.wb-nav');
        const outputPanel = document.querySelector('.wb-output');
        const sqlEditor = document.getElementById('sqlEditor');
        const runSelectedBtn = document.getElementById('runSelectedBtn');
        const runAllBtn = document.getElementById('runAllBtn');
        const outputRows = document.getElementById('actionOutputRows');
        const schemaTree = document.getElementById('schemaTree');
        const resultGridHead = document.getElementById('resultGridHead');
        const resultGridRows = document.getElementById('resultGridRows');
        const queryTabs = document.getElementById('queryTabs');
        const newTabBtn = document.getElementById('newTabBtn');
        const closeTabBtn = document.getElementById('closeTabBtn');
        const sqlFileInput = document.getElementById('sqlFileInput');

        if (!menubar || !editorLayout || !navPanel || !outputPanel || !sqlEditor || !runSelectedBtn || !runAllBtn || !outputRows || !schemaTree || !resultGridHead || !resultGridRows || !queryTabs || !newTabBtn || !closeTabBtn || !sqlFileInput) {
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

        const tabState = [
            { title: 'Query 1', sql: sqlEditor.value },
        ];
        let activeTab = 0;
        let activeSchema = '';

        const renderTabs = () => {
            queryTabs.innerHTML = tabState.map((tab, index) => {
                const activeClass = index === activeTab ? 'is-active' : '';
                return `<button class="${activeClass}" data-tab-index="${index}">${tab.title}</button>`;
            }).join('');

            queryTabs.querySelectorAll('button').forEach((button) => {
                button.addEventListener('click', () => {
                    const targetIndex = Number(button.getAttribute('data-tab-index') || '0');
                    tabState[activeTab].sql = sqlEditor.value;
                    activeTab = targetIndex;
                    sqlEditor.value = tabState[activeTab].sql;
                    renderTabs();
                });
            });
        };

        const createNewTab = () => {
            tabState[activeTab].sql = sqlEditor.value;
            const nextIndex = tabState.length + 1;
            tabState.push({ title: `Query ${nextIndex}`, sql: '' });
            activeTab = tabState.length - 1;
            sqlEditor.value = '';
            renderTabs();
            appendOutput('Tabs', `Nova aba Query ${nextIndex} criada.`);
        };

        const closeCurrentTab = () => {
            if (tabState.length === 1) {
                appendOutput('Tabs', 'Não é possível fechar a última aba.');
                return;
            }

            tabState.splice(activeTab, 1);
            activeTab = Math.max(0, activeTab - 1);
            sqlEditor.value = tabState[activeTab].sql;
            renderTabs();
            appendOutput('Tabs', 'Aba fechada.');
        };

        newTabBtn.addEventListener('click', createNewTab);
        closeTabBtn.addEventListener('click', closeCurrentTab);

        const executeSql = async (action, sql) => {
            const response = await fetch('/api/sql/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ connection_id: connectionId, sql, active_schema: activeSchema }),
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
                        <summary class="wb-schema-item" data-schema-name="${schema.name}">${schema.name}</summary>
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

            schemaTree.querySelectorAll('.wb-schema-item').forEach((element) => {
                element.addEventListener('dblclick', (event) => {
                    event.preventDefault();
                    const schemaName = element.getAttribute('data-schema-name') || '';
                    if (!schemaName) {
                        return;
                    }

                    activeSchema = schemaName;
                    schemaTree.querySelectorAll('.wb-schema-item').forEach((item) => item.classList.remove('is-selected-schema'));
                    element.classList.add('is-selected-schema');
                    appendOutput('Schema', `Schema ativo: ${activeSchema} (equivalente a USE ${activeSchema}).`);
                });
            });
        };

        const runSelected = async () => {
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
        };

        const runAll = async () => {
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
        };

        runSelectedBtn.addEventListener('click', runSelected);
        runAllBtn.addEventListener('click', runAll);

        sqlEditor.addEventListener('keydown', async (event) => {
            if (!(event.ctrlKey && event.key === 'Enter')) {
                return;
            }

            event.preventDefault();
            const start = sqlEditor.selectionStart;
            const end = sqlEditor.selectionEnd;
            const selectedSql = sqlEditor.value.slice(start, end).trim();
            const sqlToRun = selectedSql || sqlEditor.value.trim();

            if (!sqlToRun) {
                appendOutput('Shortcut Ctrl+Enter', 'Editor vazio.');
                return;
            }

            const action = selectedSql ? 'Execute Selected (Ctrl+Enter)' : 'Execute All (Ctrl+Enter)';

            try {
                await executeSql(action, sqlToRun);
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Falha ao executar via atalho.';
                appendOutput(action, message);
            }
        });

        const clearActiveSchema = () => {
            activeSchema = '';
            schemaTree.querySelectorAll('.wb-schema-item').forEach((item) => item.classList.remove('is-selected-schema'));
            appendOutput('Schema', 'Schema ativo limpo.');
        };

        const formatSqlBasic = () => {
            const keywords = ['select', 'from', 'where', 'join', 'left join', 'right join', 'inner join', 'order by', 'group by', 'limit', 'insert', 'into', 'values', 'update', 'set', 'delete', 'use'];
            let formatted = sqlEditor.value;
            keywords.forEach((keyword) => {
                const escaped = keyword.replace(' ', '\\s+');
                const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
                formatted = formatted.replace(regex, keyword.toUpperCase());
            });
            sqlEditor.value = formatted;
            tabState[activeTab].sql = formatted;
            appendOutput('Scripting', 'SQL formatado (modo básico).');
        };

        menubar.addEventListener('click', async (event) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) {
                return;
            }

            const action = target.getAttribute('data-menu-action');
            if (!action) {
                return;
            }

            switch (action) {
                case 'file.new-tab':
                case 'query.new-tab':
                    createNewTab();
                    break;
                case 'file.close-tab':
                    closeCurrentTab();
                    break;
                case 'file.open-script':
                    sqlFileInput.click();
                    break;
                case 'file.save-script': {
                    const content = sqlEditor.value;
                    const blob = new Blob([content], { type: 'text/sql;charset=utf-8' });
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = `${tabState[activeTab].title.replace(/\s+/g, '_').toLowerCase()}.sql`;
                    document.body.append(link);
                    link.click();
                    link.remove();
                    URL.revokeObjectURL(link.href);
                    appendOutput('File', 'Script exportado.');
                    break;
                }
                case 'edit.undo':
                    document.execCommand('undo');
                    break;
                case 'edit.redo':
                    document.execCommand('redo');
                    break;
                case 'edit.select-all':
                    sqlEditor.select();
                    appendOutput('Edit', 'Todo o SQL selecionado.');
                    break;
                case 'edit.clear-editor':
                    sqlEditor.value = '';
                    tabState[activeTab].sql = '';
                    appendOutput('Edit', 'Editor limpo.');
                    break;
                case 'view.toggle-schemas':
                    navPanel.classList.toggle('wb-nav--hidden');
                    editorLayout.style.gridTemplateColumns = navPanel.classList.contains('wb-nav--hidden') ? '0 1fr' : '280px 1fr';
                    break;
                case 'view.toggle-output':
                    outputPanel.classList.toggle('wb-output--hidden');
                    break;
                case 'query.run-selected':
                    await runSelected();
                    break;
                case 'query.run-all':
                    await runAll();
                    break;
                case 'database.refresh-schemas':
                    await renderSchemas();
                    appendOutput('Database', 'Schemas atualizados.');
                    break;
                case 'database.clear-active-schema':
                    clearActiveSchema();
                    break;
                case 'server.test-connection': {
                    const response = await fetch(`/api/connections/${connectionId}/test`, { method: 'POST' });
                    const payload = await parseResponse(response);
                    appendOutput('Server', payload.message || 'Teste de conexão executado.');
                    break;
                }
                case 'tools.clear-output':
                    outputRows.innerHTML = '';
                    appendOutput('Tools', 'Action Output limpo.');
                    break;
                case 'scripting.format-sql':
                    formatSqlBasic();
                    break;
                case 'help.shortcuts':
                    alert('Atalhos:\nCtrl+Enter -> Executar selecionado ou tudo\nCtrl+L -> Limpar editor (em breve)');
                    break;
                default:
                    break;
            }
        });

        sqlFileInput.addEventListener('change', async () => {
            const file = sqlFileInput.files?.[0];
            if (!file) {
                return;
            }

            const content = await file.text();
            sqlEditor.value = content;
            tabState[activeTab].sql = content;
            appendOutput('File', `Script ${file.name} carregado.`);
            sqlFileInput.value = '';
        });

        renderSchemas().catch((error) => {
            const message = error instanceof Error ? error.message : 'Falha ao carregar schemas.';
            appendOutput('Load Schemas', message);
        });
        renderTabs();
    };

    setupWelcomeScreen();
    setupEditorScreen();
})();
