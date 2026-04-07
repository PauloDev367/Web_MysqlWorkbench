<div class="wb-shell wb-shell--editor">
    <header class="wb-menubar" data-connection-id="<?= (int) ($connectionId ?? 0) ?>">
        <div class="wb-menubar__menus">File &nbsp; Edit &nbsp; View &nbsp; Query &nbsp; Database &nbsp; Server &nbsp; Tools &nbsp; Scripting &nbsp; Help</div>
        <div class="wb-menubar__status"><?= htmlspecialchars((string) ($connection ?? 'Localhost')) ?></div>
    </header>

    <div class="wb-editor-layout">
        <aside class="wb-nav">
            <div class="wb-nav__tabs">
                <button class="is-active">SCHEMAS</button>
            </div>
            <div class="wb-nav__content">
                <ul id="schemaTree" class="wb-tree"></ul>
            </div>
        </aside>

        <section class="wb-editor-main">
            <div class="wb-query-tabbar">
                <button class="is-active">Query 1</button>
            </div>
            <div class="wb-query-toolbar">
                <button id="runSelectedBtn" class="wb-tool-btn">⚡ Executar Selecionado</button>
                <button id="runAllBtn" class="wb-tool-btn">▶ Executar Tudo</button>
                <select>
                    <option>Limit to 50 rows</option>
                    <option>Limit to 200 rows</option>
                    <option>Sem limite</option>
                </select>
            </div>

            <div class="wb-editor-area">
                <textarea id="sqlEditor" spellcheck="false">SELECT * FROM users LIMIT 50;</textarea>
            </div>

            <div class="wb-result-grid">
                <div class="wb-output__title">Result Grid</div>
                <table>
                    <thead id="resultGridHead"></thead>
                    <tbody id="resultGridRows">
                        <tr>
                            <td>Nenhum resultado ainda.</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="wb-output">
                <div class="wb-output__title">Action Output</div>
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Time</th>
                            <th>Action</th>
                            <th>Message</th>
                            <th>Duration / Fetch</th>
                        </tr>
                    </thead>
                    <tbody id="actionOutputRows">
                        <tr>
                            <td>1</td>
                            <td>09:30:00</td>
                            <td>SQL Editor Opened</td>
                            <td>No query executed</td>
                            <td>0 ms</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </section>
    </div>
</div>
