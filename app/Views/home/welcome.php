<div class="wb-shell wb-shell--welcome">
    <header class="wb-menubar">
        <div class="wb-menubar__menus">File &nbsp; Edit &nbsp; View &nbsp; Database &nbsp; Tools &nbsp; Scripting &nbsp; Help</div>
    </header>

    <div class="wb-layout">
        <aside class="wb-left-icons">
            <button class="wb-icon wb-icon--active" data-home-nav="overview" title="Overview">🛢️</button>
            <button class="wb-icon" data-home-nav="connections" title="Connections">📁</button>
            <button class="wb-icon" data-home-nav="performance" title="Performance">📊</button>
            <button class="wb-icon" data-home-nav="migration" title="Migration">➜</button>
        </aside>

        <main class="wb-welcome">
            <section class="wb-welcome__hero" data-home-section="overview">
                <h1>Welcome to MySQL Webbench</h1>
                <p>
                    Interface para modelagem e consultas SQL. Comece criando uma conexão ou abrindo uma existente.
                </p>
            </section>

            <section class="wb-connections" data-home-section="connections">
                <div class="wb-connections__header">
                    <h2>MySQL Connections</h2>
                    <div class="wb-conn-actions">
                        <button id="newConnectionBtn" class="wb-mini-btn" title="Nova conexão">+</button>
                    </div>
                </div>
                <div id="connectionsGrid" class="wb-conn-grid"></div>
            </section>

            <section class="wb-home-panel wb-home-panel--hidden" data-home-section="performance">
                <div class="wb-home-panel__header">
                    <h2>Performance Dashboard</h2>
                    <button id="refreshPerformanceBtn" class="wb-btn">Atualizar</button>
                </div>
                <p id="performanceUpdatedAt" class="wb-home-panel__meta">Última atualização: --</p>
                <div class="wb-kpi-grid">
                    <div class="wb-kpi-card">
                        <div class="wb-kpi-card__label">Conexões</div>
                        <div id="kpiTotalConnections" class="wb-kpi-card__value">0</div>
                    </div>
                    <div class="wb-kpi-card">
                        <div class="wb-kpi-card__label">Online</div>
                        <div id="kpiOnlineConnections" class="wb-kpi-card__value wb-kpi-card__value--ok">0</div>
                    </div>
                    <div class="wb-kpi-card">
                        <div class="wb-kpi-card__label">Offline</div>
                        <div id="kpiOfflineConnections" class="wb-kpi-card__value wb-kpi-card__value--bad">0</div>
                    </div>
                    <div class="wb-kpi-card">
                        <div class="wb-kpi-card__label">Latência média</div>
                        <div id="kpiAvgLatency" class="wb-kpi-card__value">--</div>
                    </div>
                </div>

                <table class="wb-performance-table">
                    <thead>
                        <tr>
                            <th>Connection</th>
                            <th>Host</th>
                            <th>Status</th>
                            <th>Mensagem</th>
                            <th>Latência</th>
                        </tr>
                    </thead>
                    <tbody id="performanceRows">
                        <tr>
                            <td colspan="5">Nenhuma conexão carregada.</td>
                        </tr>
                    </tbody>
                </table>
            </section>

            <section class="wb-home-panel wb-home-panel--hidden" data-home-section="migration">
                <h2>Database Migration</h2>
                <p>Ferramentas de migração/importação em implementação.</p>
            </section>
        </main>
    </div>
</div>

<div id="connectionModal" class="wb-modal wb-modal--hidden" aria-hidden="true">
    <div class="wb-modal__backdrop" data-close-modal></div>
    <div class="wb-modal__dialog">
        <div class="wb-modal__title">Setup New Connection</div>
        <form id="connectionForm" class="wb-form">
            <div class="wb-form-row">
                <label for="connectionName">Connection Name:</label>
                <input id="connectionName" name="name" type="text" required>
            </div>
            <div class="wb-form-row">
                <label for="hostname">Hostname:</label>
                <input id="hostname" name="host" type="text" value="127.0.0.1" required>
            </div>
            <div class="wb-form-row">
                <label for="port">Port:</label>
                <input id="port" name="port" type="number" value="3306" required>
            </div>
            <div class="wb-form-row">
                <label for="username">Username:</label>
                <input id="username" name="user" type="text" value="root" required>
            </div>
            <div class="wb-form-row">
                <label for="password">Password:</label>
                <input id="password" name="password" type="password" placeholder="Opcional">
            </div>
            <div class="wb-form-row">
                <label for="defaultSchema">Default Schema:</label>
                <input id="defaultSchema" name="schema" type="text" placeholder="Opcional">
            </div>
            <div class="wb-form-actions">
                <button type="button" id="testConnectionBtn" class="wb-btn">Test Connection</button>
                <button type="button" class="wb-btn wb-btn--ghost" data-close-modal>Cancel</button>
                <button type="submit" class="wb-btn wb-btn--primary">OK</button>
            </div>
        </form>
    </div>
</div>
