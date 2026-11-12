# ARGENTI 3.0: данные и доступ

В production используется Supabase, если заданы `VITE_SUPABASE_URL` и `VITE_SUPABASE_PUBLISHABLE_KEY`. Без них страницы показывают честное состояние «реестр не подключён» и пустые показатели. Демонстрационные записи доступны **только** при `VITE_DATA_MODE=mock` в dev-сборке; они остаются в localStorage браузера и никогда не переносятся миграцией в базу.

## Схема

Исходный SQL — `supabase/schema.sql`; воспроизводимая миграция — `supabase/migrations/20261111185609_initial_schema.sql`. В схеме 12 таблиц: `senate_roles`, `profiles`, `meetings`, `meeting_agenda`, `meeting_summaries`, `meeting_participants`, `meeting_attendance`, `decisions`, `decision_updates`, `attachments`, `audit_logs`, `site_settings`. Все идентификаторы сущностей — UUID. Время заседаний хранится как `timestamptz`, интерфейс показывает `Europe/Moscow` с пометкой МСК. Статусы ограничены `CHECK`, связи — внешними ключами. Миграция добавляет только четыре технических значения справочника ролей; заседания и решения остаются пустыми.

`save_meeting(jsonb)` сохраняет заседание, повестку и итог в одной invoker-транзакции. Триггеры записывают изменения заседаний и решений в `audit_logs`, а смену статуса решения — в `decision_updates`. Публикация решения требует публикации связанного заседания.

## Роли и RLS

- `viewer`: только опубликованные заседания и решения; новый пользователь получает эту роль автоматически.
- `senator`: читает внутренние материалы, не может их менять.
- `secretary`, `chairman`: создают и изменяют материалы; настройки портала доступны для записи только председателю.
- Роль хранится в `profiles.role` и проверяется PostgreSQL RLS через `private.has_any_role`. Клиентская проверка управляет только видимостью кнопок. `user_metadata` не используется для полномочий.
- `private` не следует добавлять в exposed schemas Supabase. Браузеру нужен только publishable key. `service_role` и секреты во frontend запрещены.

Первого председателя назначает администратор после создания его Auth-пользователя. Проверьте адрес и UUID в панели Supabase, затем **в SQL Editor целевого проекта Tra** выполните подготовленное назначение с фактическим UUID:

```sql
update public.profiles
set role = 'chairman'
where id = '<UUID подтверждённого Auth-пользователя>'::uuid;
```

Проверьте, что обновилась ровно одна строка. Самостоятельная регистрация не выдаёт роль председателя. Не размещайте эту операцию в браузере.

## Проверка и ввод в эксплуатацию

`npm run audit:sql` поднимает локальный PostgreSQL 17 и проверяет применение миграции, пустую базу, RLS для `anon`, `viewer`, `senator`, `secretary`, `chairman`, историю статусов и журнал. Это **не** заменяет проверку на целевом Supabase и его Security Advisors. При доступе к Tra нужно создать проект, применить миграцию штатным Supabase CLI, проверить роли реальными JWT и затем задать публичные переменные Vercel. Не применять миграцию к NCEA или другим организациям.

Слой данных: `src/services/dataProvider.ts`; Auth: `src/services/auth.tsx`; типы: `src/types/database.ts`. Типы сейчас поддерживаются вручную по миграции; после создания проекта их стоит сравнить с результатом `supabase gen types typescript`.

Ориентиры: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Supabase Auth](https://supabase.com/docs/guides/auth).
