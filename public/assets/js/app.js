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
        const navButtons = document.querySelectorAll('[data-home-nav]');
        const sections = document.querySelectorAll('[data-home-section]');
        const refreshPerformanceBtn = document.getElementById('refreshPerformanceBtn');
        const performanceRows = document.getElementById('performanceRows');
        const performanceUpdatedAt = document.getElementById('performanceUpdatedAt');
        const kpiTotalConnections = document.getElementById('kpiTotalConnections');
        const kpiOnlineConnections = document.getElementById('kpiOnlineConnections');
        const kpiOfflineConnections = document.getElementById('kpiOfflineConnections');
        const kpiAvgLatency = document.getElementById('kpiAvgLatency');
        let cachedConnections = [];

        if (!grid || !newConnectionBtn || !modal || !form || !testConnectionBtn) {
            return;
        }

        const activateHomeSection = (sectionName) => {
            sections.forEach((section) => {
                const isActive = section.getAttribute('data-home-section') === sectionName;
                section.classList.toggle('wb-home-panel--hidden', !isActive && sectionName !== 'overview');
                if (sectionName === 'overview') {
                    const sectionType = section.getAttribute('data-home-section');
                    const shouldShow = sectionType === 'overview' || sectionType === 'connections';
                    section.classList.toggle('wb-home-panel--hidden', !shouldShow);
                }
            });

            navButtons.forEach((button) => {
                const isActive = button.getAttribute('data-home-nav') === sectionName;
                button.classList.toggle('wb-icon--active', isActive);
            });

            if (sectionName === 'performance') {
                runPerformanceChecks();
            }
        };

        navButtons.forEach((button) => {
            button.addEventListener('click', () => {
                const sectionName = button.getAttribute('data-home-nav') || 'overview';
                activateHomeSection(sectionName);
            });
        });

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
            cachedConnections = connections;

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

        const renderPerformanceSummary = (rows) => {
            const total = rows.length;
            const online = rows.filter((row) => row.success).length;
            const offline = total - online;
            const avg = rows.length
                ? Math.round(rows.reduce((sum, row) => sum + row.latencyMs, 0) / rows.length)
                : 0;

            if (kpiTotalConnections) kpiTotalConnections.textContent = String(total);
            if (kpiOnlineConnections) kpiOnlineConnections.textContent = String(online);
            if (kpiOfflineConnections) kpiOfflineConnections.textContent = String(offline);
            if (kpiAvgLatency) kpiAvgLatency.textContent = total ? `${avg} ms` : '--';
            if (performanceUpdatedAt) {
                performanceUpdatedAt.textContent = `Última atualização: ${new Date().toLocaleString('pt-BR')}`;
            }
        };

        const runPerformanceChecks = async () => {
            if (!performanceRows) {
                return;
            }

            if (!cachedConnections.length) {
                try {
                    await renderConnections();
                } catch (error) {
                    performanceRows.innerHTML = '<tr><td colspan="5">Falha ao carregar conexões.</td></tr>';
                    return;
                }
            }

            if (!cachedConnections.length) {
                performanceRows.innerHTML = '<tr><td colspan="5">Nenhuma conexão cadastrada.</td></tr>';
                renderPerformanceSummary([]);
                return;
            }

            performanceRows.innerHTML = '<tr><td colspan="5">Executando testes...</td></tr>';

            const checks = await Promise.all(cachedConnections.map(async (conn) => {
                const startedAt = performance.now();
                try {
                    const response = await fetch(`/api/connections/${conn.id}/test`, { method: 'POST' });
                    const payload = await parseResponse(response);
                    return {
                        ...conn,
                        success: true,
                        message: payload.message || 'OK',
                        latencyMs: Math.round(performance.now() - startedAt),
                    };
                } catch (error) {
                    const message = error instanceof Error ? error.message : 'Falha na conexão.';
                    return {
                        ...conn,
                        success: false,
                        message,
                        latencyMs: Math.round(performance.now() - startedAt),
                    };
                }
            }));

            performanceRows.innerHTML = checks.map((row) => `
                <tr>
                    <td>${row.name}</td>
                    <td>${row.host}:${row.port}</td>
                    <td>
                        <span class="wb-status-pill ${row.success ? 'wb-status-pill--ok' : 'wb-status-pill--bad'}">
                            ${row.success ? 'Online' : 'Offline'}
                        </span>
                    </td>
                    <td>${row.message}</td>
                    <td>${row.latencyMs} ms</td>
                </tr>
            `).join('');

            renderPerformanceSummary(checks);
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

        if (refreshPerformanceBtn) {
            refreshPerformanceBtn.addEventListener('click', runPerformanceChecks);
        }

        renderConnections().catch(() => {
            grid.innerHTML = '<p>Falha ao carregar conexões.</p>';
        });

        activateHomeSection('overview');
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
        const sqlHighlight = document.getElementById('sqlHighlight');
        const queryTabs = document.getElementById('queryTabs');
        const newTabBtn = document.getElementById('newTabBtn');
        const closeTabBtn = document.getElementById('closeTabBtn');
        const sqlFileInput = document.getElementById('sqlFileInput');

        if (!menubar || !editorLayout || !navPanel || !outputPanel || !sqlEditor || !runSelectedBtn || !runAllBtn || !outputRows || !schemaTree || !resultGridHead || !resultGridRows || !sqlHighlight || !queryTabs || !newTabBtn || !closeTabBtn || !sqlFileInput) {
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

        const escapeHtml = (value) => value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        const highlightSql = (sql) => {
            let html = escapeHtml(sql);
            html = html.replace(/(--.*$)/gm, '<span class="sql-token-comment">$1</span>');
            html = html.replace(/('([^'\\\\]|\\\\.)*')/g, '<span class="sql-token-string">$1</span>');
            html = html.replace(/\b(\d+)\b/g, '<span class="sql-token-number">$1</span>');
            html = html.replace(/\b(SELECT|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|OUTER|ON|GROUP|BY|ORDER|LIMIT|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|ALTER|DROP|TABLE|VIEW|PROCEDURE|FUNCTION|USE|AS|AND|OR|NOT|NULL|DISTINCT|HAVING)\b/gi, '<span class="sql-token-keyword">$1</span>');

            return html;
        };

        const refreshSqlHighlight = () => {
            const sql = sqlEditor.value || ' ';
            sqlHighlight.innerHTML = highlightSql(sql);
            sqlHighlight.scrollTop = sqlEditor.scrollTop;
            sqlHighlight.scrollLeft = sqlEditor.scrollLeft;
        };

        const renderTabs = () => {
            queryTabs.innerHTML = tabState.map((tab, index) => {
                const activeClass = index === activeTab ? 'is-active' : '';
                return `
                    <button class="${activeClass} wb-query-tab" data-tab-index="${index}">
                        <span class="wb-query-tab__title">${tab.title}</span>
                        <span class="wb-query-tab__close" data-close-tab-index="${index}" title="Fechar aba">x</span>
                    </button>
                `;
            }).join('');

            queryTabs.querySelectorAll('.wb-query-tab').forEach((button) => {
                button.addEventListener('click', () => {
                    const targetIndex = Number(button.getAttribute('data-tab-index') || '0');
                    tabState[activeTab].sql = sqlEditor.value;
                    activeTab = targetIndex;
                    sqlEditor.value = tabState[activeTab].sql;
                    refreshSqlHighlight();
                    renderTabs();
                });

                button.addEventListener('mousedown', (event) => {
                    if (event.button !== 1) {
                        return;
                    }

                    event.preventDefault();
                    const targetIndex = Number(button.getAttribute('data-tab-index') || '0');
                    closeTabAt(targetIndex);
                });
            });

            queryTabs.querySelectorAll('.wb-query-tab__close').forEach((closeButton) => {
                closeButton.addEventListener('click', (event) => {
                    event.stopPropagation();
                    const target = event.currentTarget;
                    if (!(target instanceof HTMLElement)) {
                        return;
                    }

                    const targetIndex = Number(target.getAttribute('data-close-tab-index') || '0');
                    closeTabAt(targetIndex);
                });
            });
        };

        const createNewTab = () => {
            tabState[activeTab].sql = sqlEditor.value;
            const nextIndex = tabState.length + 1;
            tabState.push({ title: `Query ${nextIndex}`, sql: '' });
            activeTab = tabState.length - 1;
            sqlEditor.value = '';
            refreshSqlHighlight();
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
            refreshSqlHighlight();
            renderTabs();
            appendOutput('Tabs', 'Aba fechada.');
        };

        const closeTabAt = (index) => {
            if (tabState.length === 1) {
                appendOutput('Tabs', 'Não é possível fechar a última aba.');
                return;
            }

            if (index < 0 || index >= tabState.length) {
                return;
            }

            tabState[activeTab].sql = sqlEditor.value;
            tabState.splice(index, 1);

            if (activeTab > index) {
                activeTab -= 1;
            } else if (activeTab === index) {
                activeTab = Math.max(0, activeTab - 1);
            }

            sqlEditor.value = tabState[activeTab].sql;
            refreshSqlHighlight();
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
                    <details>
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
                            <li>
                                <details>
                                    <summary>Views</summary>
                                    <ul>
                                        ${(schema.views || []).map((view) => `<li>${view}</li>`).join('') || '<li>(vazio)</li>'}
                                    </ul>
                                </details>
                            </li>
                            <li>
                                <details>
                                    <summary>Stored Procedures</summary>
                                    <ul>
                                        ${(schema.procedures || []).map((procedure) => `<li>${procedure}</li>`).join('') || '<li>(vazio)</li>'}
                                    </ul>
                                </details>
                            </li>
                            <li>
                                <details>
                                    <summary>Functions</summary>
                                    <ul>
                                        ${(schema.functions || []).map((fn) => `<li>${fn}</li>`).join('') || '<li>(vazio)</li>'}
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
            if (event.key === 'Tab' && !event.ctrlKey && !event.metaKey && !event.altKey) {
                event.preventDefault();

                const value = sqlEditor.value;
                const start = sqlEditor.selectionStart;
                const end = sqlEditor.selectionEnd;

                if (start === end) {
                    const tabChar = '    ';
                    sqlEditor.value = value.slice(0, start) + tabChar + value.slice(end);
                    sqlEditor.selectionStart = start + tabChar.length;
                    sqlEditor.selectionEnd = start + tabChar.length;
                } else {
                    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
                    const selectedBlock = value.slice(lineStart, end);
                    const lines = selectedBlock.split('\n');

                    let replaced = '';
                    let addedChars = 0;
                    let removedChars = 0;

                    if (event.shiftKey) {
                        const outdented = lines.map((line) => {
                            if (line.startsWith('    ')) {
                                removedChars += 4;
                                return line.slice(4);
                            }
                            if (line.startsWith('\t')) {
                                removedChars += 1;
                                return line.slice(1);
                            }
                            return line;
                        });
                        replaced = outdented.join('\n');
                    } else {
                        const indented = lines.map((line) => {
                            addedChars += 4;
                            return `    ${line}`;
                        });
                        replaced = indented.join('\n');
                    }

                    sqlEditor.value = value.slice(0, lineStart) + replaced + value.slice(end);
                    sqlEditor.selectionStart = lineStart;
                    sqlEditor.selectionEnd = end + addedChars - removedChars;
                }

                tabState[activeTab].sql = sqlEditor.value;
                refreshSqlHighlight();
                return;
            }

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
                case 'file.disconnect':
                    window.location.href = '/';
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
                    refreshSqlHighlight();
                    appendOutput('Edit', 'Editor limpo.');
                    break;
                case 'view.toggle-schemas':
                    navPanel.classList.toggle('wb-nav--hidden');
                    editorLayout.classList.toggle('wb-editor-layout--schemas-hidden', navPanel.classList.contains('wb-nav--hidden'));
                    appendOutput('View', navPanel.classList.contains('wb-nav--hidden') ? 'Schemas Panel ocultado.' : 'Schemas Panel exibido.');
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

            const isSqlFile = /\.sql$/i.test(file.name) || /\.txt$/i.test(file.name);
            if (!isSqlFile) {
                appendOutput('File', 'Arquivo inválido. Use .sql ou .txt.');
                sqlFileInput.value = '';
                return;
            }

            const content = await file.text();
            sqlEditor.value = content;
            tabState[activeTab].sql = content;
            tabState[activeTab].title = file.name.replace(/\.(sql|txt)$/i, '') || tabState[activeTab].title;
            refreshSqlHighlight();
            renderTabs();
            appendOutput('File', `Script ${file.name} carregado.`);
            sqlFileInput.value = '';
        });

        sqlEditor.addEventListener('input', () => {
            tabState[activeTab].sql = sqlEditor.value;
            refreshSqlHighlight();
        });

        sqlEditor.addEventListener('scroll', () => {
            sqlHighlight.scrollTop = sqlEditor.scrollTop;
            sqlHighlight.scrollLeft = sqlEditor.scrollLeft;
        });

        renderSchemas().catch((error) => {
            const message = error instanceof Error ? error.message : 'Falha ao carregar schemas.';
            appendOutput('Load Schemas', message);
        });
        renderTabs();
        refreshSqlHighlight();
    };

    setupWelcomeScreen();
    setupEditorScreen();
})();
