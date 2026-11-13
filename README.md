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

Для режима Supabase заполните `.env.local` по `.env.example` значениями **только нового проекта ARGENTI-Senate** и запустите `npm run dev`. Без переменных production-сборка работает с пустыми состояниями, не подставляет mock-данные.

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

`/`, `/dashboard`, `/schedule`, `/archive`, `/meetings/:id`, `/analytics`, `/decisions`, `/about`, `/login`, `/forgot-password`, `/reset-password`, `/admin`. Маршрутизация на Vercel настроена в `vercel.json`. Редактирование заседаний и решений доступно только председателю/секретарю; в mock-режиме формы работают локально. Процедура назначения председателя, схема и ограничения — в [DATA-ARCHITECTURE.md](docs/DATA-ARCHITECTURE.md). Для ссылок восстановления пароля нужно добавить `/reset-password` в Redirect URLs целевого Supabase-проекта.

Отдельный проект Supabase пока не создан: аккаунт владельца достиг лимита двух активных бесплатных проектов во всех организациях. После уточнения пользователя целевая организация — `nelli-english`; существующие проекты не затрагиваются. Миграция проверена на локальном PostgreSQL. Сравнение с существующей базой NCEA — в [NCEA-ARCHITECTURE-REVIEW.md](docs/NCEA-ARCHITECTURE-REVIEW.md).

## Публикация

Проект Vercel `yozekkk1/tra-senate-site` доступен по адресу https://tra-senate-site.vercel.app. Пока новый Supabase-проект не создан, публичная версия показывает честные пустые состояния и сообщение о недоступности реестра. Источник GitHub подключается после выдачи Vercel GitHub App доступа к репозиторию `Yozekkk/TRA-senate-site`; до этого публикация выполняется через Vercel CLI из проверенного локального дерева.
