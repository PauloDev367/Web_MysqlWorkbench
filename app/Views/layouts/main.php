<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= isset($title) ? htmlspecialchars((string) $title) : 'Web SQL Workbench' ?></title>
    <link rel="stylesheet" href="/assets/css/app.css">
</head>
<body>
    <?= $content ?>
    <script src="/assets/js/app.js"></script>
</body>
</html>
