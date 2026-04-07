(() => {
    const defaultConnections = [
        { name: 'Localhost', host: '127.0.0.1', port: '3306', user: 'root', schema: '' },
        { name: 'Novo privilegio', host: '127.0.0.1', port: '3306', user: 'lab', schema: '' },
    ];

    const connectionStorageKey = 'wb.connections';

    const loadConnections = () => {
        const stored = localStorage.getItem(connectionStorageKey);
        if (!stored) {
            localStorage.setItem(connectionStorageKey, JSON.stringify(defaultConnections));
            return defaultConnections;
        }

        try {
            const parsed = JSON.parse(stored);
            return Array.isArray(parsed) ? parsed : defaultConnections;
        } catch (error) {
            return defaultConnections;
        }
    };

    const saveConnections = (connections) => {
        localStorage.setItem(connectionStorageKey, JSON.stringify(connections));
    };

    const setupWelcomeScreen = () => {
        const grid = document.getElementById('connectionsGrid');
        const newConnectionBtn = document.getElementById('newConnectionBtn');
        const modal = document.getElementById('connectionModal');
        const form = document.getElementById('connectionForm');

        if (!grid || !newConnectionBtn || !modal || !form) {
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

        const renderConnections = () => {
            const connections = loadConnections();
            grid.innerHTML = connections.map((conn) => `
                <article class="wb-conn-card" data-connection-name="${conn.name}">
                    <h3>${conn.name}</h3>
                    <p>${conn.user}</p>
                    <p>${conn.host}:${conn.port}</p>
                </article>
            `).join('');

            grid.querySelectorAll('.wb-conn-card').forEach((card) => {
                card.addEventListener('click', () => {
                    const connectionName = card.getAttribute('data-connection-name') || 'Localhost';
                    window.location.href = `/sql-editor?connection=${encodeURIComponent(connectionName)}`;
                });
            });
        };

        newConnectionBtn.addEventListener('click', openModal);
        closeModalEls.forEach((element) => element.addEventListener('click', closeModal));

        form.addEventListener('submit', (event) => {
            event.preventDefault();
            const formData = new FormData(form);
            const newConnection = {
                name: String(formData.get('name') || '').trim(),
                host: String(formData.get('host') || '127.0.0.1').trim(),
                port: String(formData.get('port') || '3306').trim(),
                user: String(formData.get('user') || 'root').trim(),
                schema: String(formData.get('schema') || '').trim(),
            };

            if (!newConnection.name) {
                alert('Informe o nome da conexão.');
                return;
            }

            const connections = loadConnections();
            connections.push(newConnection);
            saveConnections(connections);
            renderConnections();
            closeModal();
            form.reset();
        });

        renderConnections();
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
