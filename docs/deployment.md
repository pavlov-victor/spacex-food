# Render + Convex

## Текущее состояние

- Backend реализован и опубликован в **dev** проекта `vitek/frontend`.
- Публичный client URL: `https://good-aardvark-691.eu-west-1.convex.cloud`.
- Ключи Dify и ключи подписи Convex Auth настроены только на этом dev deployment.
- Контракт данных, входа, загрузки меню и генерации: [backend-api.md](backend-api.md).
- Production Convex и сервис Render этой сессией не создавались.

## Render MCP

Проверка 2026-09-12: плагин установлен в Cursor и включён в `.cursor/settings.json`. Его конфигурация использует `https://mcp.render.com/mcp` и `RENDER_API_KEY`. Переменная не обнаружена в окружении этой сессии и проектном `.env`. Неавторизованный initialize вернул HTTP 401. Сервер достижим; доступ к аккаунту/workspace не подтверждён. Отдельная OAuth-сессия в Cursor могла существовать, но инструменты Render этой сессии не предоставлены.

Открыть настройки MCP → Render → Authenticate, если доступен OAuth. Установленная локальная версия ожидает API key: создать его в Render Account Settings → API Keys и передать `RENDER_API_KEY` в окружение MCP-клиента, затем переподключить сервер. Альтернатива — обновить официальный плагин и авторизоваться через браузер. Проектный `.env` сам по себе не передаёт ключ Cursor MCP. Ключ не отправлять в чат или Git.

После подключения: запросить список workspaces, выбрать нужный, получить список services.

Источник: https://render.com/docs/mcp-server

## Деплой CRM для хакатона

1. Войти в https://dashboard.render.com/ и выбрать workspace.
2. Подключить GitHub, разрешить доступ к `pavlov-victor/spacex-food`.
3. Выбрать **New → Blueprint**, репозиторий и `main`. В корне уже есть `render.yaml`.
4. На запрос переменной `VITE_CONVEX_URL` указать `https://good-aardvark-691.eu-west-1.convex.cloud`. Это публичный URL dev backend, не секрет. Применить конфигурацию.
5. После deploy открыть выданный `onrender.com` URL. Для полноценного UI дизайнер должен подключить login/logout и формы через hooks.

Можно вместо Blueprint создать **New → Static Site** вручную:

| Поле | Значение |
| --- | --- |
| Repository / Branch | `pavlov-victor/spacex-food` / `main` |
| Root Directory | `frontend` |
| Build Command | `npm ci && npm run build` |
| Publish Directory | `dist` |
| Environment | `NODE_VERSION=24.12.0` и `VITE_CONVEX_URL` из шага 4 |
| Rewrite | `/*` → `/index.html`, действие Rewrite |

Выбрать один способ, чтобы не создать дубликат сервиса. После подключения GitHub Render может автоматически пересобирать сайт при push в выбранную ветку. В текущем варианте frontend и backend деплоятся отдельно: backend обновляется через `npx convex dev`, frontend — через Render. Для отдельной витрины позже добавим второй Static Site, когда появится её приложение.

Источники: https://render.com/docs/static-sites, https://render.com/docs/blueprint-spec, https://vite.dev/guide/static-deploy#render

## Новый dev deployment

```sh
cd frontend
npm install
npx convex dev
```

Авторизоваться, выбрать команду/проект и cloud deployment. CLI создаст `.env.local` (не коммитить). Для настройки серверных ключей на выбранном dev deployment:

```sh
node scripts/configure-backend.mjs
npx convex dev --once
npx convex run bootstrap:seed '{}'
```

Скрипт создаёт JWT key pair, если он отсутствует, и копирует только `DIFY_MENU_API`/`DIFY_PERSON_API` из корневого `.env` в environment Convex. Значения передаются через stdin и не выводятся. Существующая JWT-пара сохраняется. Seed создаёт первую демо-организацию с заданным владельцем аккаунтом `admin / 123`; повторный запуск не сбрасывает пароль.

Convex выбран для Backend / state по https://hackathon.cursorserbia.com/stack. LLM workflow остаётся в Dify; Convex отвечает за данные, права доступа, файлы и серверные вызовы workflow.

## Переход на production

1. Подготовить production deployment Convex и настроить **отдельно** JWT keys и оба ключа Dify; dev environment не копируется автоматически. Для реального использования задать собственные учетные данные администратора вместо демо seed.
2. Создать production deploy key в настройках Convex и добавить в Render как `CONVEX_DEPLOY_KEY` (секрет, без `VITE_`).
3. Build Command: `npm ci && npx convex deploy --cmd 'npm run build' --cmd-url-env-var-name VITE_CONVEX_URL`. Для Blueprint обновить `render.yaml`, секрет описать через `sync: false`; убрать вручную заданный dev `VITE_CONVEX_URL`, чтобы CLI передал production URL сборке.
4. Переменные `DIFY_MENU_API`, `DIFY_PERSON_API` хранятся в backend environment Convex. `XAI_API_KEY`/`EXA_API_KEY` для HTTP-узлов workflow — в настройках опубликованного Dify приложения.

Источники: https://docs.convex.dev/quickstart/react, https://docs.convex.dev/production/hosting/custom, https://docs.convex.dev/cli/overview, https://labs.convex.dev/auth/setup/manual
