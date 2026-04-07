(() => {
    const parseResponse = async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            const details = [
                payload.error || payload.message || 'Erro ao processar requisição.',
                payload.sql_state ? `SQLSTATE: ${payload.sql_state}` : '',
                payload.driver_code ? `Driver Code: ${payload.driver_code}` : '',
                payload.driver_message || '',
                payload.error_type ? `Type: ${payload.error_type}` : '',
            ].filter(Boolean).join(' | ');
            throw new Error(details || 'Erro ao processar requisição.');
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
        const editorMain = document.querySelector('.wb-editor-main');
        const navPanel = document.querySelector('.wb-nav');
        const outputPanel = document.querySelector('.wb-output');
        const sqlEditor = document.getElementById('sqlEditor');
        const runSelectedBtn = document.getElementById('runSelectedBtn');
        const runAllBtn = document.getElementById('runAllBtn');
        const outputRows = document.getElementById('actionOutputRows');
        const schemaTree = document.getElementById('schemaTree');
        const goHomeBtn = document.getElementById('goHomeBtn');
        const refreshSchemasBtn = document.getElementById('refreshSchemasBtn');
        const connectionErrorBanner = document.getElementById('connectionErrorBanner');
        const resultGridHead = document.getElementById('resultGridHead');
        const resultGridRows = document.getElementById('resultGridRows');
        const sqlHighlight = document.getElementById('sqlHighlight');
        const queryTabs = document.getElementById('queryTabs');
        const newTabBtn = document.getElementById('newTabBtn');
        const closeTabBtn = document.getElementById('closeTabBtn');
        const schemasPanelResizer = document.getElementById('schemasPanelResizer');
        const resultGridResizer = document.getElementById('resultGridResizer');
        const actionOutputResizer = document.getElementById('actionOutputResizer');
        const sqlFileInput = document.getElementById('sqlFileInput');

        if (!menubar || !editorLayout || !editorMain || !navPanel || !outputPanel || !sqlEditor || !runSelectedBtn || !runAllBtn || !outputRows || !schemaTree || !goHomeBtn || !refreshSchemasBtn || !connectionErrorBanner || !resultGridHead || !resultGridRows || !sqlHighlight || !queryTabs || !newTabBtn || !closeTabBtn || !schemasPanelResizer || !resultGridResizer || !actionOutputResizer || !sqlFileInput) {
            return;
        }

        const outputErrorMenu = document.createElement('div');
        outputErrorMenu.className = 'wb-context-menu wb-context-menu--hidden';
        outputErrorMenu.innerHTML = '<button type="button" data-output-action="copy-error">Copiar mensagem de erro</button>';
        document.body.appendChild(outputErrorMenu);
        let outputErrorMessage = '';

        const hideOutputErrorMenu = () => {
            outputErrorMenu.classList.add('wb-context-menu--hidden');
            outputErrorMessage = '';
        };

        const appendOutput = (action, message) => {
            const now = new Date();
            const time = now.toLocaleTimeString('pt-BR');
            const fullMessage = String(message);
            const isError = /(erro|error|falha|exception|sqlstate|doesn't exist|unknown column|syntax)/i.test(fullMessage);
            const row = document.createElement('tr');
            if (isError) {
                row.classList.add('wb-output-row--error');
                row.setAttribute('data-output-error', fullMessage);
            }
            row.innerHTML = `
                <td>${outputRows.children.length + 1}</td>
                <td>${time}</td>
                <td>${action}</td>
                <td title="${fullMessage.replace(/"/g, '&quot;')}">${isError ? `⚠ ${fullMessage}` : fullMessage}</td>
                <td>${Math.floor(Math.random() * 30) + 1} ms</td>
            `;
            outputRows.prepend(row);

            if (isError) {
                row.addEventListener('contextmenu', (event) => {
                    event.preventDefault();
                    outputErrorMessage = row.getAttribute('data-output-error') || '';
                    if (!outputErrorMessage) {
                        return;
                    }
                    outputErrorMenu.style.left = `${event.clientX}px`;
                    outputErrorMenu.style.top = `${event.clientY}px`;
                    outputErrorMenu.classList.remove('wb-context-menu--hidden');
                });
            }
        };

        outputErrorMenu.addEventListener('click', async (event) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) {
                return;
            }
            if (target.getAttribute('data-output-action') !== 'copy-error') {
                return;
            }
            if (!outputErrorMessage) {
                return;
            }
            await copyToClipboard(outputErrorMessage);
            appendOutput('Action Output', 'Mensagem de erro copiada.');
            hideOutputErrorMenu();
        });

        document.addEventListener('click', (event) => {
            if (event.target instanceof Node && outputErrorMenu.contains(event.target)) {
                return;
            }
            hideOutputErrorMenu();
        });

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
            { title: 'Query 1', sql: sqlEditor.value, fileHandle: null, isDirty: false },
        ];
        const minSchemasWidth = 180;
        const maxSchemasWidth = 520;
        const minResultHeight = 120;
        const maxResultHeight = 380;
        const minOutputHeight = 100;
        const maxOutputHeight = 280;
        const defaultSchemasWidth = 280;
        const defaultResultHeight = 265;
        const defaultOutputHeight = 165;
        const panelLayoutStorageKey = `wb-editor-panel-layout-${connectionId}`;
        let activeTab = 0;
        let activeSchema = '';
        let tableContextMenuTarget = null;
        let schemaCatalog = {
            schemas: [],
            tables: [],
            columns: [],
            views: [],
            procedures: [],
            functions: [],
        };
        let autocompleteItems = [];
        let autocompleteIndex = 0;
        let autocompleteRange = null;

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

        const autocompleteEl = document.createElement('div');
        autocompleteEl.className = 'wb-autocomplete wb-autocomplete--hidden';
        sqlEditor.parentElement?.appendChild(autocompleteEl);

        const hideAutocomplete = () => {
            autocompleteEl.classList.add('wb-autocomplete--hidden');
            autocompleteItems = [];
            autocompleteIndex = 0;
            autocompleteRange = null;
        };

        const extractTokenRange = () => {
            const cursor = sqlEditor.selectionStart;
            const value = sqlEditor.value;
            let start = cursor;
            while (start > 0 && /[A-Za-z0-9_.$`]/.test(value[start - 1])) {
                start -= 1;
            }

            const rawToken = value.slice(start, cursor);
            const token = rawToken.replace(/`/g, '').toLowerCase();
            return { start, end: cursor, token };
        };

        const getCaretPosition = () => {
            const mirror = document.createElement('div');
            const style = window.getComputedStyle(sqlEditor);
            const properties = [
                'boxSizing', 'width', 'height', 'overflowX', 'overflowY',
                'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
                'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
                'fontStyle', 'fontVariant', 'fontWeight', 'fontStretch', 'fontSize',
                'fontSizeAdjust', 'lineHeight', 'fontFamily', 'textAlign', 'textTransform',
                'textIndent', 'textDecoration', 'letterSpacing', 'wordSpacing',
            ];
            properties.forEach((prop) => {
                mirror.style[prop] = style[prop];
            });
            mirror.style.position = 'absolute';
            mirror.style.visibility = 'hidden';
            mirror.style.whiteSpace = 'pre-wrap';
            mirror.style.wordWrap = 'break-word';
            mirror.style.left = '-9999px';
            document.body.appendChild(mirror);

            const value = sqlEditor.value;
            const cursor = sqlEditor.selectionStart;
            mirror.textContent = value.slice(0, cursor);
            const span = document.createElement('span');
            span.textContent = value.slice(cursor) || '.';
            mirror.appendChild(span);
            const coords = {
                left: span.offsetLeft - sqlEditor.scrollLeft + Number.parseFloat(style.paddingLeft),
                top: span.offsetTop - sqlEditor.scrollTop + Number.parseFloat(style.paddingTop),
            };
            mirror.remove();
            return coords;
        };

        const renderAutocomplete = () => {
            if (!autocompleteItems.length) {
                hideAutocomplete();
                return;
            }

            autocompleteEl.innerHTML = autocompleteItems.map((item, idx) => `
                <button type="button" class="wb-autocomplete__item ${idx === autocompleteIndex ? 'is-active' : ''}" data-autocomplete-index="${idx}">
                    <span>${item.label}</span>
                    <small>${item.type}</small>
                </button>
            `).join('');
            autocompleteEl.classList.remove('wb-autocomplete--hidden');

            const caret = getCaretPosition();
            autocompleteEl.style.left = `${Math.max(8, caret.left)}px`;
            autocompleteEl.style.top = `${Math.max(8, caret.top + 24)}px`;

            autocompleteEl.querySelectorAll('[data-autocomplete-index]').forEach((element) => {
                element.addEventListener('click', () => {
                    const idx = Number(element.getAttribute('data-autocomplete-index') || '0');
                    autocompleteIndex = idx;
                    applyAutocomplete();
                });
            });
        };

        const applyAutocomplete = () => {
            const selected = autocompleteItems[autocompleteIndex];
            if (!selected || !autocompleteRange) {
                hideAutocomplete();
                return;
            }

            const value = sqlEditor.value;
            const before = value.slice(0, autocompleteRange.start);
            const after = value.slice(autocompleteRange.end);
            const insertText = selected.insertText;
            sqlEditor.value = `${before}${insertText}${after}`;
            const nextPos = before.length + insertText.length;
            sqlEditor.selectionStart = nextPos;
            sqlEditor.selectionEnd = nextPos;
            tabState[activeTab].sql = sqlEditor.value;
            tabState[activeTab].isDirty = true;
            refreshSqlHighlight();
            renderTabs();
            hideAutocomplete();
        };

        const buildAutocompleteItems = (token) => {
            const keywords = ['SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'ON', 'GROUP BY', 'ORDER BY', 'LIMIT', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'ALTER', 'DROP', 'TABLE', 'VIEW', 'USE'];
            const result = [];
            const pushItems = (items, type) => {
                items.forEach((item) => {
                    if (!token || item.toLowerCase().includes(token)) {
                        result.push({
                            label: item,
                            insertText: item,
                            type,
                        });
                    }
                });
            };

            pushItems(keywords, 'keyword');
            pushItems(schemaCatalog.schemas, 'schema');
            pushItems(schemaCatalog.tables, 'table');
            pushItems(schemaCatalog.columns, 'column');
            pushItems(schemaCatalog.views, 'view');
            pushItems(schemaCatalog.procedures, 'procedure');
            pushItems(schemaCatalog.functions, 'function');

            const seen = new Set();
            return result.filter((item) => {
                const key = `${item.type}:${item.label.toLowerCase()}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            }).slice(0, 18);
        };

        const updateAutocomplete = (force = false) => {
            const range = extractTokenRange();
            if (!force && range.token.length < 1) {
                hideAutocomplete();
                return;
            }

            autocompleteRange = range;
            autocompleteItems = buildAutocompleteItems(force ? '' : range.token);
            autocompleteIndex = 0;
            renderAutocomplete();
        };

        const renderTabs = () => {
            queryTabs.innerHTML = tabState.map((tab, index) => {
                const activeClass = index === activeTab ? 'is-active' : '';
                const statusIndicator = tab.isDirty
                    ? '<span class="wb-query-tab__dirty" title="Alterações não salvas">●</span>'
                    : `<span class="wb-query-tab__close" data-close-tab-index="${index}" title="Fechar aba">x</span>`;
                return `
                    <button class="${activeClass} wb-query-tab" data-tab-index="${index}">
                        <span class="wb-query-tab__title">${tab.title}</span>
                        ${statusIndicator}
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
            tabState.push({ title: `Query ${nextIndex}`, sql: '', fileHandle: null, isDirty: false });
            activeTab = tabState.length - 1;
            sqlEditor.value = '';
            refreshSqlHighlight();
            renderTabs();
            appendOutput('Tabs', `Nova aba Query ${nextIndex} criada.`);
        };

        const bindPanelResizers = () => {
            const savePanelLayout = () => {
                const payload = {
                    schemasWidth: Number.parseInt(getComputedStyle(editorLayout).getPropertyValue('--wb-schemas-width'), 10) || defaultSchemasWidth,
                    resultHeight: Number.parseInt(getComputedStyle(editorMain).getPropertyValue('--wb-result-height'), 10) || defaultResultHeight,
                    outputHeight: Number.parseInt(getComputedStyle(editorMain).getPropertyValue('--wb-output-height'), 10) || defaultOutputHeight,
                };
                localStorage.setItem(panelLayoutStorageKey, JSON.stringify(payload));
            };

            const applyPanelLayout = (layout) => {
                const schemasWidth = Math.max(minSchemasWidth, Math.min(maxSchemasWidth, Number(layout.schemasWidth) || defaultSchemasWidth));
                const resultHeight = Math.max(minResultHeight, Math.min(maxResultHeight, Number(layout.resultHeight) || defaultResultHeight));
                const outputHeight = Math.max(minOutputHeight, Math.min(maxOutputHeight, Number(layout.outputHeight) || defaultOutputHeight));
                editorLayout.style.setProperty('--wb-schemas-width', `${schemasWidth}px`);
                editorMain.style.setProperty('--wb-result-height', `${resultHeight}px`);
                editorMain.style.setProperty('--wb-output-height', `${outputHeight}px`);
            };

            const restorePanelLayout = () => {
                try {
                    const raw = localStorage.getItem(panelLayoutStorageKey);
                    if (!raw) {
                        applyPanelLayout({});
                        return;
                    }
                    applyPanelLayout(JSON.parse(raw));
                } catch (error) {
                    applyPanelLayout({});
                }
            };

            const resetPanelLayout = () => {
                localStorage.removeItem(panelLayoutStorageKey);
                applyPanelLayout({});
            };

            schemasPanelResizer.addEventListener('pointerdown', (event) => {
                if (navPanel.classList.contains('wb-nav--hidden')) {
                    return;
                }
                event.preventDefault();
                schemasPanelResizer.classList.add('is-dragging');
                const startX = event.clientX;
                const startWidth = navPanel.getBoundingClientRect().width;
                document.body.style.cursor = 'col-resize';

                const onMove = (moveEvent) => {
                    const delta = moveEvent.clientX - startX;
                    const nextWidth = Math.max(minSchemasWidth, Math.min(maxSchemasWidth, startWidth + delta));
                    editorLayout.style.setProperty('--wb-schemas-width', `${nextWidth}px`);
                };

                const onUp = () => {
                    document.body.style.cursor = '';
                    schemasPanelResizer.classList.remove('is-dragging');
                    window.removeEventListener('pointermove', onMove);
                    window.removeEventListener('pointerup', onUp);
                    savePanelLayout();
                };

                window.addEventListener('pointermove', onMove);
                window.addEventListener('pointerup', onUp);
            });

            const bindHorizontal = (element, variableName, minValue, maxValue) => {
                element.addEventListener('pointerdown', (event) => {
                    event.preventDefault();
                    element.classList.add('is-dragging');
                    const startY = event.clientY;
                    const current = Number.parseInt(getComputedStyle(editorMain).getPropertyValue(variableName), 10) || minValue;
                    document.body.style.cursor = 'row-resize';

                    const onMove = (moveEvent) => {
                        const delta = moveEvent.clientY - startY;
                        const nextHeight = Math.max(minValue, Math.min(maxValue, current - delta));
                        editorMain.style.setProperty(variableName, `${nextHeight}px`);
                    };

                    const onUp = () => {
                        document.body.style.cursor = '';
                        element.classList.remove('is-dragging');
                        window.removeEventListener('pointermove', onMove);
                        window.removeEventListener('pointerup', onUp);
                        savePanelLayout();
                    };

                    window.addEventListener('pointermove', onMove);
                    window.addEventListener('pointerup', onUp);
                });
            };

            bindHorizontal(resultGridResizer, '--wb-result-height', minResultHeight, maxResultHeight);
            bindHorizontal(actionOutputResizer, '--wb-output-height', minOutputHeight, maxOutputHeight);

            restorePanelLayout();
            return { resetPanelLayout };
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

        const showConnectionError = (message) => {
            connectionErrorBanner.textContent = message;
            connectionErrorBanner.classList.remove('wb-error-banner--hidden');
        };

        const hideConnectionError = () => {
            connectionErrorBanner.textContent = '';
            connectionErrorBanner.classList.add('wb-error-banner--hidden');
        };

        const quoteIdentifier = (value) => `\`${String(value).replace(/`/g, '``')}\``;

        const copyToClipboard = async (text) => {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
                return;
            }

            const helper = document.createElement('textarea');
            helper.value = text;
            helper.style.position = 'fixed';
            helper.style.opacity = '0';
            document.body.appendChild(helper);
            helper.focus();
            helper.select();
            document.execCommand('copy');
            helper.remove();
        };

        const convertRowsToCsv = (columns, rows) => {
            const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
            const header = columns.map((column) => escape(column)).join(',');
            const body = rows.map((row) => columns.map((column) => escape(row[column])).join(',')).join('\n');
            return `${header}\n${body}`;
        };

        const createContextMenu = () => {
            const menu = document.createElement('div');
            menu.className = 'wb-context-menu wb-context-menu--hidden';
            menu.innerHTML = `
                <button type="button" data-table-action="table.search-records">Buscar registros</button>
                <button type="button" data-table-action="table.copy-crud">Copiar CRUD para clipboard</button>
                <div class="wb-context-submenu wb-context-submenu--hidden" data-crud-submenu>
                    <button type="button" data-table-action="table.copy-crud.select">Select</button>
                    <button type="button" data-table-action="table.copy-crud.insert">Insert</button>
                    <button type="button" data-table-action="table.copy-crud.update">Update</button>
                    <button type="button" data-table-action="table.copy-crud.delete">Delete</button>
                </div>
                <button type="button" data-table-action="table.export-data">Table data export</button>
                <button type="button" data-table-action="table.drop">Drop table</button>
                <button type="button" data-table-action="table.truncate">Truncate table</button>
                <button type="button" data-table-action="table.refresh-all">Refresh all</button>
            `;
            document.body.appendChild(menu);
            return menu;
        };

        const contextMenu = createContextMenu();
        const crudSubmenu = contextMenu.querySelector('[data-crud-submenu]');

        const hideContextMenu = () => {
            contextMenu.classList.add('wb-context-menu--hidden');
            if (crudSubmenu instanceof HTMLElement) {
                crudSubmenu.classList.add('wb-context-submenu--hidden');
            }
            tableContextMenuTarget = null;
        };

        const showContextMenu = (x, y, schemaName, tableName, columns) => {
            tableContextMenuTarget = {
                schemaName,
                tableName,
                columns: Array.isArray(columns) ? columns : [],
            };

            contextMenu.style.left = `${x}px`;
            contextMenu.style.top = `${y}px`;
            contextMenu.classList.remove('wb-context-menu--hidden');
            if (crudSubmenu instanceof HTMLElement) {
                crudSubmenu.classList.add('wb-context-submenu--hidden');
            }
        };

        const executeSqlRaw = async (sql) => {
            const response = await fetch('/api/sql/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ connection_id: connectionId, sql, active_schema: activeSchema }),
            });

            return parseResponse(response);
        };

        const executeSql = async (action, sql) => {
            const payload = await executeSqlRaw(sql);
            hideConnectionError();
            syncActiveSchemaFromSql(sql, payload);
            renderResultGrid(payload.columns || [], payload.rows || []);
            appendOutput(action, `${payload.message} (${payload.duration_ms} ms)`);
        };

        const extractUseSchema = (sql) => {
            const regex = /\bUSE\s+`?([a-zA-Z0-9_]+)`?\s*;?/gi;
            let match = null;
            let found = '';
            while ((match = regex.exec(sql)) !== null) {
                found = String(match[1] || '');
            }
            return found;
        };

        const setActiveSchemaSelection = (schemaName, logMessage = false) => {
            if (!schemaName) {
                return;
            }
            activeSchema = schemaName;
            let foundElement = null;
            schemaTree.querySelectorAll('.wb-schema-item').forEach((item) => {
                item.classList.remove('is-selected-schema');
                if (item.getAttribute('data-schema-name') === schemaName) {
                    foundElement = item;
                }
            });
            if (foundElement instanceof HTMLElement) {
                foundElement.classList.add('is-selected-schema');
            }
            if (typeof saveUiState === 'function') {
                saveUiState();
            }
            if (logMessage) {
                appendOutput('Schema', `Schema ativo: ${activeSchema} (equivalente a USE ${activeSchema}).`);
            }
        };

        const syncActiveSchemaFromSql = (sql, payload) => {
            if (!payload || payload.success !== true) {
                return;
            }
            const detectedSchema = extractUseSchema(sql);
            if (!detectedSchema) {
                return;
            }
            setActiveSchemaSelection(detectedSchema, true);
        };

        const supportsFileSystemAccess = () => (
            typeof window.showOpenFilePicker === 'function'
            && typeof window.showSaveFilePicker === 'function'
        );

        const openScriptFromFileSystem = async () => {
            if (!supportsFileSystemAccess()) {
                sqlFileInput.click();
                appendOutput('File', 'Navegador sem File System Access API. Usando modo legado.');
                return;
            }

            const [handle] = await window.showOpenFilePicker({
                multiple: false,
                types: [{
                    description: 'SQL files',
                    accept: {
                        'text/sql': ['.sql'],
                        'text/plain': ['.txt'],
                    },
                }],
            });
            if (!handle) {
                return;
            }

            const file = await handle.getFile();
            const content = await file.text();
            const title = file.name.replace(/\.(sql|txt)$/i, '') || tabState[activeTab].title;
            sqlEditor.value = content;
            tabState[activeTab].sql = content;
            tabState[activeTab].title = title;
            tabState[activeTab].fileHandle = handle;
            tabState[activeTab].isDirty = false;
            refreshSqlHighlight();
            renderTabs();
            appendOutput('File', `Arquivo local aberto: ${file.name}`);
        };

        const saveScriptToFileSystem = async () => {
            const content = sqlEditor.value;
            let handle = tabState[activeTab].fileHandle;

            if (!supportsFileSystemAccess()) {
                const blob = new Blob([content], { type: 'text/sql;charset=utf-8' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `${tabState[activeTab].title.replace(/\s+/g, '_').toLowerCase()}.sql`;
                document.body.append(link);
                link.click();
                link.remove();
                URL.revokeObjectURL(link.href);
                appendOutput('File', 'Navegador sem API local. Script exportado por download.');
                return;
            }

            if (!handle) {
                handle = await window.showSaveFilePicker({
                    suggestedName: `${tabState[activeTab].title.replace(/\s+/g, '_') || 'query'}.sql`,
                    types: [{
                        description: 'SQL files',
                        accept: { 'text/sql': ['.sql'] },
                    }],
                });
                if (!handle) {
                    return;
                }
                tabState[activeTab].fileHandle = handle;
            }

            const writable = await handle.createWritable();
            await writable.write(content);
            await writable.close();
            const handleName = handle.name || tabState[activeTab].title;
            tabState[activeTab].title = handleName.replace(/\.(sql|txt)$/i, '') || tabState[activeTab].title;
            tabState[activeTab].isDirty = false;
            renderTabs();
            appendOutput('File', `Arquivo salvo localmente: ${handleName}`);
        };

        const schemaCacheKey = `wb-schema-tree-cache-${connectionId}`;
        const schemaUiKey = `wb-schema-tree-ui-${connectionId}`;

        const readJsonStorage = (key, fallback) => {
            try {
                const raw = localStorage.getItem(key);
                if (!raw) return fallback;
                return JSON.parse(raw);
            } catch (error) {
                return fallback;
            }
        };

        const writeJsonStorage = (key, value) => {
            try {
                localStorage.setItem(key, JSON.stringify(value));
            } catch (error) {
                // Ignore storage quota / private mode issues
            }
        };

        const getUiState = () => readJsonStorage(schemaUiKey, { expandedNodes: [], activeSchema: '' });

        const saveUiState = () => {
            const expandedNodes = Array.from(schemaTree.querySelectorAll('details[data-node-key]'))
                .filter((node) => node.open)
                .map((node) => node.getAttribute('data-node-key'))
                .filter((value) => Boolean(value));

            writeJsonStorage(schemaUiKey, {
                expandedNodes,
                activeSchema,
            });
        };

        const renderSchemaTree = (schemas) => {
            schemaCatalog = {
                schemas: schemas.map((schema) => String(schema.name || '')),
                tables: schemas.flatMap((schema) => (schema.tables || []).map((table) => String(table.name || ''))),
                columns: schemas.flatMap((schema) => (schema.tables || []).flatMap((table) => (table.columns || []).map((col) => String(col || '')))),
                views: schemas.flatMap((schema) => (schema.views || []).map((view) => String(view || ''))),
                procedures: schemas.flatMap((schema) => (schema.procedures || []).map((procedure) => String(procedure || ''))),
                functions: schemas.flatMap((schema) => (schema.functions || []).map((fn) => String(fn || ''))),
            };

            if (!schemas.length) {
                schemaTree.innerHTML = '<li>Nenhum schema encontrado.</li>';
                return;
            }

            const uiState = getUiState();
            const expanded = new Set(Array.isArray(uiState.expandedNodes) ? uiState.expandedNodes : []);
            if (!activeSchema && typeof uiState.activeSchema === 'string') {
                activeSchema = uiState.activeSchema;
            }
            const isOpen = (nodeKey, defaultOpen = false) => (expanded.has(nodeKey) || defaultOpen ? 'open' : '');

            schemaTree.innerHTML = schemas.map((schema) => `
                <li>
                    <details data-node-key="schema:${schema.name}" ${isOpen(`schema:${schema.name}`)}>
                        <summary class="wb-schema-item ${activeSchema === schema.name ? 'is-selected-schema' : ''}" data-schema-name="${schema.name}">
                            <span class="wb-tree-icon wb-tree-icon--schema">🗃</span>${schema.name}
                        </summary>
                        <ul>
                            <li>
                                <details data-node-key="schema:${schema.name}:tables" ${isOpen(`schema:${schema.name}:tables`, true)}>
                                    <summary><span class="wb-tree-icon wb-tree-icon--group">🗂</span>Tables</summary>
                                    <ul>
                                        ${(schema.tables || []).map((table) => `
                                            <li>
                                                <details data-node-key="schema:${schema.name}:table:${table.name}" ${isOpen(`schema:${schema.name}:table:${table.name}`)}>
                                                    <summary class="wb-table-item" data-schema-name="${schema.name}" data-table-name="${table.name}" data-table-columns="${encodeURIComponent(JSON.stringify(table.columns || []))}">
                                                        <span class="wb-tree-icon wb-tree-icon--table">▦</span>${table.name}
                                                    </summary>
                                                    <ul>
                                                        <li>
                                                            <details data-node-key="schema:${schema.name}:table:${table.name}:columns" ${isOpen(`schema:${schema.name}:table:${table.name}:columns`, true)}>
                                                                <summary><span class="wb-tree-icon wb-tree-icon--column-group">◫</span>Columns</summary>
                                                                <ul>
                                                                    ${(table.columns || []).map((column) => `<li class="wb-tree-leaf wb-tree-leaf--column"><span class="wb-tree-icon wb-tree-icon--column">◇</span>${column}</li>`).join('') || '<li>(vazio)</li>'}
                                                                </ul>
                                                            </details>
                                                        </li>
                                                    </ul>
                                                </details>
                                            </li>
                                        `).join('') || '<li>(vazio)</li>'}
                                    </ul>
                                </details>
                            </li>
                            <li>
                                <details data-node-key="schema:${schema.name}:views" ${isOpen(`schema:${schema.name}:views`)}>
                                    <summary><span class="wb-tree-icon wb-tree-icon--view">▤</span>Views</summary>
                                    <ul>
                                        ${(schema.views || []).map((view) => `<li class="wb-tree-leaf"><span class="wb-tree-icon wb-tree-icon--view">▤</span>${view}</li>`).join('') || '<li>(vazio)</li>'}
                                    </ul>
                                </details>
                            </li>
                            <li>
                                <details data-node-key="schema:${schema.name}:procedures" ${isOpen(`schema:${schema.name}:procedures`)}>
                                    <summary><span class="wb-tree-icon wb-tree-icon--procedure">ƒ</span>Stored Procedures</summary>
                                    <ul>
                                        ${(schema.procedures || []).map((procedure) => `<li class="wb-tree-leaf"><span class="wb-tree-icon wb-tree-icon--procedure">ƒ</span>${procedure}</li>`).join('') || '<li>(vazio)</li>'}
                                    </ul>
                                </details>
                            </li>
                            <li>
                                <details data-node-key="schema:${schema.name}:functions" ${isOpen(`schema:${schema.name}:functions`)}>
                                    <summary><span class="wb-tree-icon wb-tree-icon--function">λ</span>Functions</summary>
                                    <ul>
                                        ${(schema.functions || []).map((fn) => `<li class="wb-tree-leaf"><span class="wb-tree-icon wb-tree-icon--function">λ</span>${fn}</li>`).join('') || '<li>(vazio)</li>'}
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
                    setActiveSchemaSelection(schemaName, true);
                });
            });

            schemaTree.querySelectorAll('.wb-table-item').forEach((element) => {
                element.addEventListener('contextmenu', (event) => {
                    event.preventDefault();
                    const tableName = element.getAttribute('data-table-name') || '';
                    const schemaName = element.getAttribute('data-schema-name') || '';
                    const rawColumns = decodeURIComponent(element.getAttribute('data-table-columns') || '%5B%5D');
                    let columns = [];
                    try {
                        columns = JSON.parse(rawColumns);
                    } catch (err) {
                        columns = [];
                    }

                    if (!tableName || !schemaName) {
                        return;
                    }

                    showContextMenu(event.clientX, event.clientY, schemaName, tableName, columns);
                });
            });

            schemaTree.querySelectorAll('details[data-node-key]').forEach((node) => {
                node.addEventListener('toggle', saveUiState);
            });

            hideConnectionError();
        };

        const renderSchemas = async (options = {}) => {
            const force = Boolean(options.force);
            if (!force) {
                const cachedSchemas = readJsonStorage(schemaCacheKey, null);
                if (Array.isArray(cachedSchemas) && cachedSchemas.length) {
                    renderSchemaTree(cachedSchemas);
                    return;
                }
            }

            const response = await fetch(`/api/connections/${connectionId}/schemas`);
            const payload = await parseResponse(response);
            const schemas = Array.isArray(payload.data) ? payload.data : [];
            writeJsonStorage(schemaCacheKey, schemas);
            renderSchemaTree(schemas);
        };

        contextMenu.addEventListener('click', async (event) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) {
                return;
            }

            const action = target.getAttribute('data-table-action');
            if (!action || !tableContextMenuTarget) {
                return;
            }

            const { schemaName, tableName, columns } = tableContextMenuTarget;
            const qualifiedTable = `${quoteIdentifier(schemaName)}.${quoteIdentifier(tableName)}`;

            if (action === 'table.copy-crud') {
                if (crudSubmenu instanceof HTMLElement) {
                    crudSubmenu.classList.toggle('wb-context-submenu--hidden');
                }
                return;
            }

            hideContextMenu();

            try {
                if (action === 'table.search-records') {
                    await executeSql('Table', `SELECT * FROM ${qualifiedTable} LIMIT 200;`);
                    return;
                }

                if (action.startsWith('table.copy-crud.')) {
                    const cols = columns.length ? columns : ['id'];
                    const columnList = cols.map((col) => quoteIdentifier(col)).join(', ');
                    const insertValues = cols.map(() => '?').join(', ');
                    const updateSet = cols.map((col) => `${quoteIdentifier(col)} = ?`).join(', ');
                    const templates = {
                        select: `SELECT ${columnList} FROM ${qualifiedTable} LIMIT 200;`,
                        insert: `INSERT INTO ${qualifiedTable} (${columnList}) VALUES (${insertValues});`,
                        update: `UPDATE ${qualifiedTable} SET ${updateSet} WHERE id = ?;`,
                        delete: `DELETE FROM ${qualifiedTable} WHERE id = ?;`,
                    };

                    const key = action.replace('table.copy-crud.', '');
                    const selectedTemplate = templates[key];
                    if (!selectedTemplate) {
                        appendOutput('Table', 'Opção de CRUD inválida.');
                        return;
                    }

                    await copyToClipboard(selectedTemplate);
                    appendOutput('Table', `${key.toUpperCase()} copiado para clipboard (${schemaName}.${tableName}).`);
                    return;
                }

                if (action === 'table.export-data') {
                    const payload = await executeSqlRaw(`SELECT * FROM ${qualifiedTable};`);
                    const exportColumns = Array.isArray(payload.columns) ? payload.columns : [];
                    const exportRows = Array.isArray(payload.rows) ? payload.rows : [];
                    if (!exportColumns.length || !exportRows.length) {
                        appendOutput('Table Export', `Sem dados para exportar em ${schemaName}.${tableName}.`);
                        return;
                    }

                    const csv = convertRowsToCsv(exportColumns, exportRows);
                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = `${schemaName}_${tableName}.csv`;
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                    URL.revokeObjectURL(link.href);
                    appendOutput('Table Export', `Export concluído: ${schemaName}_${tableName}.csv`);
                    return;
                }

                if (action === 'table.drop') {
                    const confirmed = window.confirm(`Confirma DROP TABLE ${schemaName}.${tableName}? Esta ação é irreversível.`);
                    if (!confirmed) {
                        appendOutput('Table', 'Drop table cancelado.');
                        return;
                    }

                    await executeSql('Table', `DROP TABLE ${qualifiedTable};`);
                    await renderSchemas({ force: true });
                    appendOutput('Table', `Tabela removida: ${schemaName}.${tableName}.`);
                    return;
                }

                if (action === 'table.truncate') {
                    const confirmed = window.confirm(`Confirma TRUNCATE TABLE ${schemaName}.${tableName}?`);
                    if (!confirmed) {
                        appendOutput('Table', 'Truncate table cancelado.');
                        return;
                    }

                    await executeSql('Table', `TRUNCATE TABLE ${qualifiedTable};`);
                    appendOutput('Table', `Tabela truncada: ${schemaName}.${tableName}.`);
                    return;
                }

                if (action === 'table.refresh-all') {
                    await renderSchemas({ force: true });
                    appendOutput('Table', 'Schemas atualizados.');
                }
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Falha na ação da tabela.';
                showConnectionError(`Falha ao executar ação na tabela: ${message}`);
                appendOutput('Table', message);
            }
        });

        document.addEventListener('click', (event) => {
            if (event.target instanceof Node && contextMenu.contains(event.target)) {
                return;
            }
            hideContextMenu();
        });

        window.addEventListener('resize', hideContextMenu);
        window.addEventListener('scroll', hideContextMenu);

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
                showConnectionError(`Erro de conexão/execução: ${message}`);
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
                showConnectionError(`Erro de conexão/execução: ${message}`);
                appendOutput('Execute All', message);
            }
        };

        runSelectedBtn.addEventListener('click', runSelected);
        runAllBtn.addEventListener('click', runAll);

        sqlEditor.addEventListener('keydown', async (event) => {
            if (event.ctrlKey && event.key.toLowerCase() === 's') {
                event.preventDefault();
                try {
                    await saveScriptToFileSystem();
                } catch (error) {
                    if (error instanceof DOMException && error.name === 'AbortError') {
                        appendOutput('File', 'Salvamento cancelado.');
                        return;
                    }
                    throw error;
                }
                return;
            }

            if (!autocompleteEl.classList.contains('wb-autocomplete--hidden')) {
                if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    autocompleteIndex = Math.min(autocompleteItems.length - 1, autocompleteIndex + 1);
                    renderAutocomplete();
                    return;
                }
                if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    autocompleteIndex = Math.max(0, autocompleteIndex - 1);
                    renderAutocomplete();
                    return;
                }
                if (event.key === 'Enter' || event.key === 'Tab') {
                    event.preventDefault();
                    applyAutocomplete();
                    return;
                }
                if (event.key === 'Escape') {
                    event.preventDefault();
                    hideAutocomplete();
                    return;
                }
            }

            if (event.ctrlKey && event.key === ' ') {
                event.preventDefault();
                updateAutocomplete(true);
                return;
            }

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
                tabState[activeTab].isDirty = true;
                refreshSqlHighlight();
                hideAutocomplete();
                renderTabs();
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
                showConnectionError(`Erro de conexão/execução: ${message}`);
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

        const panelLayoutControls = bindPanelResizers();
        goHomeBtn.addEventListener('click', () => {
            window.location.href = '/';
        });
        refreshSchemasBtn.addEventListener('click', async () => {
            await renderSchemas({ force: true });
            appendOutput('Database', 'Schemas atualizados (forçado).');
        });

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
                    try {
                        await openScriptFromFileSystem();
                    } catch (error) {
                        if (error instanceof DOMException && error.name === 'AbortError') {
                            appendOutput('File', 'Abertura de arquivo cancelada.');
                            break;
                        }
                        throw error;
                    }
                    break;
                case 'file.save-script': {
                    try {
                        await saveScriptToFileSystem();
                    } catch (error) {
                        if (error instanceof DOMException && error.name === 'AbortError') {
                            appendOutput('File', 'Salvamento cancelado.');
                            break;
                        }
                        throw error;
                    }
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
                    tabState[activeTab].isDirty = true;
                    refreshSqlHighlight();
                    renderTabs();
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
                case 'view.reset-panel-layout':
                    panelLayoutControls.resetPanelLayout();
                    appendOutput('View', 'Layout dos painéis restaurado para o padrão.');
                    break;
                case 'query.run-selected':
                    await runSelected();
                    break;
                case 'query.run-all':
                    await runAll();
                    break;
                case 'database.refresh-schemas':
                    await renderSchemas({ force: true });
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
            tabState[activeTab].fileHandle = null;
            tabState[activeTab].isDirty = false;
            refreshSqlHighlight();
            renderTabs();
            appendOutput('File', `Script ${file.name} carregado.`);
            sqlFileInput.value = '';
        });

        sqlEditor.addEventListener('input', () => {
            tabState[activeTab].sql = sqlEditor.value;
            tabState[activeTab].isDirty = true;
            refreshSqlHighlight();
            updateAutocomplete();
            renderTabs();
        });

        sqlEditor.addEventListener('scroll', () => {
            sqlHighlight.scrollTop = sqlEditor.scrollTop;
            sqlHighlight.scrollLeft = sqlEditor.scrollLeft;
            if (!autocompleteEl.classList.contains('wb-autocomplete--hidden')) {
                renderAutocomplete();
            }
        });

        sqlEditor.addEventListener('blur', () => {
            window.setTimeout(hideAutocomplete, 120);
        });

        renderSchemas().catch((error) => {
            const message = error instanceof Error ? error.message : 'Falha ao carregar schemas.';
            showConnectionError(`Falha ao conectar no banco: ${message}`);
            appendOutput('Load Schemas', message);
        });
        renderTabs();
        refreshSqlHighlight();
    };

    setupWelcomeScreen();
    setupEditorScreen();
})();
