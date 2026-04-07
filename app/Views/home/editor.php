<div class="wb-shell wb-shell--editor">
    <header class="wb-menubar" data-connection-id="<?= (int) ($connectionId ?? 0) ?>">
        <div class="wb-menubar__menus">
            <div class="wb-menu">
                <button class="wb-menu__trigger">File</button>
                <div class="wb-menu__dropdown">
                    <button data-menu-action="file.new-tab">New Query Tab</button>
                    <button data-menu-action="file.open-script">Open SQL File...</button>
                    <button data-menu-action="file.save-script">Save Current Tab</button>
                    <button data-menu-action="file.close-tab">Close Current Tab</button>
                    <button data-menu-action="file.disconnect">Disconnect</button>
                </div>
            </div>
            <div class="wb-menu">
                <button class="wb-menu__trigger">Edit</button>
                <div class="wb-menu__dropdown">
                    <button data-menu-action="edit.undo">Undo</button>
                    <button data-menu-action="edit.redo">Redo</button>
                    <button data-menu-action="edit.select-all">Select All</button>
                    <button data-menu-action="edit.clear-editor">Clear Editor</button>
                </div>
            </div>
            <div class="wb-menu">
                <button class="wb-menu__trigger">View</button>
                <div class="wb-menu__dropdown">
                    <button data-menu-action="view.toggle-schemas">Toggle Schemas Panel</button>
                    <button data-menu-action="view.toggle-output">Toggle Output Panel</button>
                </div>
            </div>
            <div class="wb-menu">
                <button class="wb-menu__trigger">Query</button>
                <div class="wb-menu__dropdown">
                    <button data-menu-action="query.run-selected">Run Selected</button>
                    <button data-menu-action="query.run-all">Run All</button>
                    <button data-menu-action="query.new-tab">New Query Tab</button>
                </div>
            </div>
            <div class="wb-menu">
                <button class="wb-menu__trigger">Database</button>
                <div class="wb-menu__dropdown">
                    <button data-menu-action="database.refresh-schemas">Refresh Schemas</button>
                    <button data-menu-action="database.clear-active-schema">Clear Active Schema</button>
                </div>
            </div>
            <div class="wb-menu">
                <button class="wb-menu__trigger">Server</button>
                <div class="wb-menu__dropdown">
                    <button data-menu-action="server.test-connection">Test Connection</button>
                </div>
            </div>
            <div class="wb-menu">
                <button class="wb-menu__trigger">Tools</button>
                <div class="wb-menu__dropdown">
                    <button data-menu-action="tools.clear-output">Clear Action Output</button>
                </div>
            </div>
            <div class="wb-menu">
                <button class="wb-menu__trigger">Scripting</button>
                <div class="wb-menu__dropdown">
                    <button data-menu-action="scripting.format-sql">Format SQL (Basic)</button>
                </div>
            </div>
            <div class="wb-menu">
                <button class="wb-menu__trigger">Help</button>
                <div class="wb-menu__dropdown">
                    <button data-menu-action="help.shortcuts">Keyboard Shortcuts</button>
                </div>
            </div>
        </div>
        <div class="wb-menubar__status"><?= htmlspecialchars((string) ($connection ?? 'Localhost')) ?></div>
    </header>
    <input id="sqlFileInput" type="file" accept=".sql,.txt" hidden>

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
                <div id="queryTabs" class="wb-query-tabs"></div>
                <button id="newTabBtn">+</button>
                <button id="closeTabBtn">x</button>
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
