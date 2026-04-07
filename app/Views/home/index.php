<div class="wb-app">
    <header class="wb-topbar">
        <div class="wb-brand">MySQL Webbench</div>
        <nav class="wb-tabs">
            <button class="wb-tab wb-tab--active">SQL File 1*</button>
            <button class="wb-tab">+</button>
        </nav>
    </header>

    <main class="wb-main">
        <aside class="wb-sidebar">
            <h2>Schemas</h2>
            <ul class="wb-tree">
                <li>
                    <details open>
                        <summary>localhost</summary>
                        <ul>
                            <li>
                                <details open>
                                    <summary>app_db</summary>
                                    <ul>
                                        <li>Tabelas</li>
                                        <li>Views</li>
                                        <li>Stored Procedures</li>
                                    </ul>
                                </details>
                            </li>
                            <li>
                                <details>
                                    <summary>analytics_db</summary>
                                    <ul>
                                        <li>Tabelas</li>
                                        <li>Views</li>
                                    </ul>
                                </details>
                            </li>
                        </ul>
                    </details>
                </li>
            </ul>
        </aside>

        <section class="wb-workspace">
            <div class="wb-toolbar">
                <button id="runSelectedBtn" class="wb-btn wb-btn--primary">Executar Selecionado</button>
                <button class="wb-btn">Executar Tudo</button>
                <button class="wb-btn">Limpar</button>
            </div>

            <div class="wb-editor-panel">
                <label for="sqlEditor">Editor SQL</label>
                <textarea id="sqlEditor" spellcheck="false">SELECT * FROM users LIMIT 100;</textarea>
            </div>

            <div class="wb-results">
                <div class="wb-results__header">Resultados</div>
                <div class="wb-results__content">
                    <table>
                        <thead>
                            <tr>
                                <th>id</th>
                                <th>name</th>
                                <th>email</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>1</td>
                                <td>Ana</td>
                                <td>ana@example.com</td>
                            </tr>
                            <tr>
                                <td>2</td>
                                <td>João</td>
                                <td>joao@example.com</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    </main>
</div>
