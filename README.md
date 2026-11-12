# ARGENTI — Digital Senate 3.0

Цифровой портал Сената Технологической Республики Аргенти. Публичные страницы показывают только опубликованные материалы. Без подключения Supabase сайт сообщает, что реестр недоступен; демонстрационные записи включаются лишь в локальном режиме разработки.

## Локальный запуск

```bash
cd /home/yozek/Documents/WebSite
nix-shell
npm ci
VITE_DATA_MODE=mock npm run dev
```

Откройте `http://localhost:5173`. `shell.nix` закрепляет Node.js 26, Git, Chromium и PostgreSQL 17, не меняя глобальную конфигурацию NixOS. Без Nix нужен совместимый Node.js и локальные Chromium/PostgreSQL для браузерных и SQL-проверок.

Для режима Supabase заполните `.env.local` по `.env.example` значениями **только целевого проекта Tra** и запустите `npm run dev`. Без переменных production-сборка работает с пустыми состояниями, не подставляет mock-данные.

## Проверки

```bash
npm run lint
npm run build
npm run audit:data
npm run audit:sql
npm run audit:interactions
npm run audit:visual -- artifacts/visual-tests/mock
```

Для последних двух команд нужен dev-сервер на `127.0.0.1:5173`. Скриншоты помещаются в `artifacts/visual-tests/` и не публикуются. Production preview: `npm run preview -- --host 127.0.0.1 --port 4173` после сборки.

## Страницы

`/`, `/dashboard`, `/schedule`, `/archive`, `/meetings/:id`, `/analytics`, `/decisions`, `/about`, `/login`, `/admin`. Маршрутизация на Vercel настроена в `vercel.json`. Редактирование заседаний и решений доступно только председателю/секретарю; в mock-режиме формы работают локально. Процедура назначения председателя, схема и ограничения — в [DATA-ARCHITECTURE.md](docs/DATA-ARCHITECTURE.md).

В текущем окружении организация Supabase Tra недоступна подключению Codex. Удалённая база и реальные данные пока не созданы; миграция проверена на локальном PostgreSQL. Это ограничение не влияет на сборку и просмотр пустого портала.
