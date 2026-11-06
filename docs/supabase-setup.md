# Настройка Supabase

## 1. Создание проекта

1. Создайте бесплатный проект в Supabase и сохраните пароль базы данных в менеджере паролей.
2. Дождитесь запуска проекта.
3. Не добавляйте пароль базы данных, access token или `service_role` key в `.env`, исходный код и репозиторий.

## 2. Применение миграций через SQL Editor

Миграции хранятся в `supabase/migrations` и применяются в порядке имён файлов.

1. Откройте **SQL Editor** в панели Supabase.
2. Создайте новый запрос и вставьте содержимое `supabase/migrations/20261106000000_initial_schema.sql`.
3. Выполните запрос один раз. Повторный запуск этой миграции вручную приведёт к ошибке, поскольку типы и таблицы уже существуют.
4. После появления следующих миграций применяйте их так же по очереди.

Начальная миграция создаёт таблицы, ограничения, индексы и профили пользователей. RLS включён для всех таблиц, но политики доступа будут добавлены отдельной миграцией на этапе 3. До её применения клиентский API не сможет читать или изменять данные приложения.

## 3. Создание тестовых пользователей

Откройте **Authentication → Users** и создайте четырёх пользователей с подтверждённым email:

- два постановщика;
- два исполнителя.

Пароли задайте индивидуальные и передавайте их отдельно от репозитория. При создании через панель Supabase профиль добавляется автоматически с ролью `executor`.

После создания пользователей выполните в SQL Editor следующий запрос, подставив реальные email и выбранные отображаемые имена:

```sql
update public.profiles as profile
set
  role = 'manager',
  display_name = 'Постановщик 1'
from auth.users as auth_user
where auth_user.id = profile.id
  and auth_user.email = 'manager1@example.com';

update public.profiles as profile
set
  role = 'manager',
  display_name = 'Постановщик 2'
from auth.users as auth_user
where auth_user.id = profile.id
  and auth_user.email = 'manager2@example.com';

update public.profiles as profile
set display_name = 'Исполнитель 1'
from auth.users as auth_user
where auth_user.id = profile.id
  and auth_user.email = 'executor1@example.com';

update public.profiles as profile
set display_name = 'Исполнитель 2'
from auth.users as auth_user
where auth_user.id = profile.id
  and auth_user.email = 'executor2@example.com';
```

Проверить результат можно запросом:

```sql
select profile.id, auth_user.email, profile.role, profile.display_name
from public.profiles as profile
join auth.users as auth_user on auth_user.id = profile.id
order by profile.role, profile.display_name;
```

## 4. Отключение открытой регистрации

В настройках **Authentication → Sign In / Providers → Email** отключите **Allow new users to sign up**. Администратор по-прежнему сможет создавать пользователей вручную.

Для тестовой версии письма с подтверждением и восстановление пароля не настраиваются. Пользователи создаются уже подтверждёнными.

## 5. Подключение frontend

Скопируйте `.env.example` в `.env` и заполните публичные параметры из **Project Settings → API**:

```dotenv
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

В клиенте используется только publishable/anon key. `service_role` key обходит RLS и не должен попадать в переменные `VITE_*`, браузерный код или репозиторий.

После заполнения `.env` перезапустите Vite:

```bash
npm run dev
```
