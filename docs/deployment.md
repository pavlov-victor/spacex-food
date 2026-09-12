# Render + Convex

## Проверка Render MCP (2026-09-12)

- Плагин Render установлен в локальном Cursor и включён в `.cursor/settings.json`.
- Его MCP-конфигурация использует `https://mcp.render.com/mcp` и Authorization из `RENDER_API_KEY`.
- `RENDER_API_KEY` не обнаружен в окружении этой сессии и проектном `.env`.
- Прямой initialize без авторизации вернул HTTP 401: сервер достижим, доступ к аккаунту этим запросом не проверен.
- В этой сессии инструменты Render не предоставлены. Список workspaces/services получить пока невозможно. Это не доказывает отсутствие отдельной OAuth-сессии в Cursor.

Чтобы подключить: открыть настройки MCP в Cursor, найти Render и выполнить Authenticate, если доступен OAuth. Установленная локальная версия ожидает API key: для неё создать ключ в Render Account Settings → API Keys и настроить `RENDER_API_KEY` в окружении MCP-клиента, затем переподключить сервер. Запись в проектный `.env` сама по себе не гарантирует, что Cursor передаст её MCP. Альтернатива — обновить официальный плагин и авторизоваться через браузер. Ключ не отправлять в чат или Git.

После подключения: запросить список workspaces, выбрать нужный workspace и получить список services. Наличие плагина само по себе не подтверждает авторизацию. Подключение в Cursor не предоставляет автоматически инструменты другой агентской сессии.

Источник: https://render.com/docs/mcp-server

## Деплой текущей CRM

В корне есть `render.yaml`, описывающий текущую React CRM. Это готовая конфигурация, но сервис ещё не создан и публичный URL не получен.

1. Войти в https://dashboard.render.com/ и выбрать workspace.
2. Подключить GitHub, разрешить Render доступ к `pavlov-victor/spacex-food`.
3. После попадания `render.yaml` в GitHub выбрать **New → Blueprint**, указать этот репозиторий и `main`, проверить сервис `spacex-food-crm`, применить.
4. Дождаться успешного deploy и открыть выданный `onrender.com` URL.

Альтернатива — **New → Static Site**, без Blueprint:

| Поле | Значение |
| --- | --- |
| Repository | `pavlov-victor/spacex-food` |
| Branch | `main` |
| Root Directory | `frontend` |
| Build Command | `npm ci && npm run build` |
| Publish Directory | `dist` |
| Environment | `NODE_VERSION=24.12.0` |
| Rewrite | `/*` → `/index.html`, действие Rewrite |

Выбрать один способ, чтобы не создать два одинаковых сервиса. Для демо API-ключи не нужны. После подключения GitHub Render может автоматически пересобирать сайт при push в выбранную ветку. Текущий сайт сохраняет продукты в браузере каждого посетителя; общая база пока не подключена.

Для отдельной витрины позже добавим второй Static Site с её root directory, когда дизайнер подготовит приложение. Текущий Blueprint разворачивает только имеющуюся CRM.

Источники: https://render.com/docs/static-sites, https://render.com/docs/blueprint-spec, https://vite.dev/guide/static-deploy#render

## База и backend: Convex

В стеке хакатона Convex указан для Backend / state. Используем его базу, queries/mutations и серверные actions для вызова Dify. Сам LLM workflow остаётся в Dify.

Планируемый путь: страницы → hooks → слой данных → Convex → Dify. Продукты, меню и организации храним в Convex; файлы можно хранить в Convex File Storage. Публичная витрина получает только опубликованное меню. CRM-операции должны проверять пользователя и принадлежность к организации на сервере.

Что сделать владельцу:

1. Войти в https://dashboard.convex.dev/ через GitHub, выбрать/создать команду и пригласить нужных участников.
2. В каталоге `frontend` выполнить `npx convex dev`. Пакет `convex` уже добавлен в зависимости. Авторизоваться через браузер, создать/выбрать проект `spacex-food`. Это создаст dev deployment и локальные настройки `.env.local`; не коммитить их.
3. Сообщить имя проекта и факт завершения входа. Секреты присылать не нужно. Затем агент логики реализует `frontend/convex/` (схему, проверку доступа, queries/mutations/actions), provider и заменит демо-адаптер через существующий hook.
4. Для публикации реального backend создать **production deploy key** в настройках проекта Convex и добавить его как `CONVEX_DEPLOY_KEY` в переменные сборки Render. Не добавлять префикс `VITE_`.
5. Когда backend реализован, поменять Build Command на `npm ci && npx convex deploy --cmd 'npm run build' --cmd-url-env-var-name VITE_CONVEX_URL`. Для Blueprint это изменение тоже внести в `render.yaml`; секрет добавить через `sync: false`. Эта команда совместно публикует backend и собирает frontend с production URL.
6. Ключи Dify и прочие серверные секреты хранить в environment variables нужного deployment Convex (dev и prod отдельно), а ключи провайдеров Dify — в настройках Dify. Конкретные имена ключей вызова workflow согласовать после проверки API menu/product.

Шаги 4–6 — после реализации Convex backend. Текущий `render.yaml` намеренно собирает рабочее локальное демо и не требует ещё отсутствующих функций. Один `VITE_CONVEX_URL` не переключит приложение на базу. Это публичный URL, который попадёт в JS; API-ключи туда не помещаем.

Источники: https://hackathon.cursorserbia.com/stack, https://docs.convex.dev/quickstart/react, https://docs.convex.dev/production/hosting/custom, https://docs.convex.dev/cli/overview
