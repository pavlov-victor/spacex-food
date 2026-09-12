# Backend и контракт для фронтендера

Backend опубликован в dev deployment Convex проекта `vitek/frontend`.

- Client URL: `https://good-aardvark-691.eu-west-1.convex.cloud`
- Организация: **SpaceX Food Demo**
- Первый вход: **admin / 123** (заданные владельцем демо-данные).
- В этой организации через настоящий Dify menu сохранены **78 продуктов и 5 категорий**, меню `Savada · Demo menu`.
- Фото стола сохранено у организации и автоматически подставляется при генерации.
- Для блюда `Karadordeva` сохранён текстовый черновик карточки со статусом `partial`: опубликованный Dify product вернул отказ поиска и Image HTTP-узлов. Это не успешная генерация изображения.

## Граница с UI

`src/main.tsx` уже оборачивает приложение в `BackendProvider`. Provider использует Convex Auth и общий workspace context. Все страницы/формы остаются за дизайнером. Единственное изменение разметки текущего `App.tsx` — поддержка `null` вместо выдуманной цены.

Старый демонстрационный интерфейс ещё содержит фиктивные счётчики, подписи localStorage и локальную кнопку Log out. Они не отражают новый backend. Дизайнер должен подключить настоящие login/logout и формы через следующие hooks. При отсутствии входа сервер не отдаёт данные и не принимает операции.

| Импорт | Назначение |
| --- | --- |
| `@/hooks/use-session` → `useSession()` | `login(username,password)`, `register(organizationName,username,password)`, `logout()`, `isAuthenticated`, `isLoading` |
| `@/hooks/use-workspace` → `useWorkspace()` | `organizations`, `organizationId`, `selectOrganization(id)`, `createOrganization(name)`, состояние загрузки |
| `@/hooks/use-products` → `useProducts(menuId?)` | Продукты текущей организации, `createProduct`, состояния, `loadMore()`, `hasMore` |
| `@/hooks/use-menu-workflows` → `useMenuWorkflows()` | Меню, категории, задачи, загрузка фотографий, импорт, генерация, редактирование |
| `@/hooks/use-menu-workflows` → `useProductCard(productId)` | Блюдо и его последняя карточка; результат `undefined` пока загружается |
| `@/domain/credentials` → `generateOrganizationCredentials()` | Локальная генерация логина и случайного пароля для формы регистрации |

`useSession.register` создаёт новый аккаунт и первую организацию, затем входит в неё. Пароли новых аккаунтов: 8–128 символов. Логин: 3–64 символа `[a-z0-9_.-]`, без различия регистра. `admin` зарезервирован. `createOrganization` создаёт дополнительную организацию для уже вошедшего администратора; пароль при этом остаётся у аккаунта. Для отдельного администратора другой организации используется регистрация нового аккаунта.

```tsx
const session = useSession();
const credentials = generateOrganizationCredentials();
// Показать владельцу credentials и дать сохранить их.
await session.register('My cafe', credentials.username, credentials.password);
// Либо вход существующего:
await session.login('admin', '123');
```

Состояние открытых диалогов, формы, спиннеры и отображение ошибок принадлежат UI. Все async-операции кроме `createProduct` бросают ошибку: ловить её в обработчике и показывать пользователю. `createProduct` сохраняет прежний контракт `{ok:true,product}` / `{ok:false,error}`.

`Product.price` теперь `number | null`: неизвестную цену показывать как «—». `currency` также nullable: не подставлять автоматически RSD для распознанного меню. `id` и `categoryId` — ID Convex. Исходный текст OCR хранится отдельно от сгенерированного описания; отсутствие состава не заполняется выдуманными подтверждениями.

## Загрузка меню

```tsx
const flow = useMenuWorkflows();
const requestId = crypto.randomUUID(); // сохранить до результата запроса
const fileIds = await Promise.all(files.map(file => flow.uploadImage(file, 'menu')));
const jobId = await flow.importMenu('Main menu', fileIds, requestId);
```

- JPG/PNG, 1–5 фото одного меню, до 10 MB на файл.
- Файлы отправляются в Convex Storage через авторизованный action. Принадлежность файлов организации проверяется на сервере.
- Затем `DIFY_MENU_API` вызывает `spacex-menu` с `menu_images` (remote URLs).
- Возвращается `jobId` сразу; статус обновляется реактивно в `flow.jobs`.
- До 250 блюд и 100 категорий за один импорт; более крупные меню разбивать на отдельные загрузки. Результат большего размера отклоняется целиком, без молчаливой потери строк.
- Категории нормализуются по имени внутри организации. ID категорий/продуктов от Dify сохраняются как источник, а связи в базе используют собственные ID.
- Одинаковый `requestId` в организации возвращает ту же задачу. При сетевом повторе использовать прежний ID; новый ID означает новый импорт.

## Фото стола и карточка блюда

```tsx
await flow.uploadImage(tablePhoto, 'table'); // один раз для кафе, можно заменить
const dishFileId = dishPhoto ? await flow.uploadImage(dishPhoto, 'dish') : undefined;
const jobId = await flow.generateCard({
  productId,
  requestId: crypto.randomUUID(),
  dishFileId,
  targetLanguages: 'sr,en,ru',
  imagePrompt: 'Natural daylight, square menu card',
  restaurantContext: 'Additional recipe details supplied by the restaurant',
  confirmed: {
    ingredients: ['ingredient explicitly confirmed by restaurant'],
    // served_hot, vegan, spicy, low_calorie, kids_menu, takeaway,
    // allergens, allergens_complete — только если администратор подтвердил.
  },
});
```

`confirmed` в примере — формат, не данные реального блюда. Не передавать ингредиенты и свойства, о которых ресторан не сообщил. При отсутствии `confirmed` используются ранее сохранённые подтверждения блюда. Переданный объект заменяет набор подтверждений целиком.

Сервер собирает `product_json` из выбранного блюда и исходного описания меню, добавляет подтверждения ресторана, `table_image_url` организации, опциональный `dish_image_url`. Затем вызывает `DIFY_PERSON_API` (`spacex-product`). Произвольный JSON блюда от клиента для запуска не принимается.

Генерация создаёт отдельную версию карточки. Исходные цена/название/описание меню остаются в `products`, AI-текст — в `cards.draftJson`. `useProductCard` возвращает `card.imageUrl` для сохранённого изображения и `card.warnings`. `draftJson` содержит переводы, классификацию и прочие поля контракта Dify. Изображение x.ai скачивается в Convex Storage, поэтому временная ссылка провайдера не является постоянным источником карточки. Если скачать изображение не удалось, сохраняется текстовый черновик с предупреждением.

Изменения исходного продукта и подтверждений: `flow.updateProduct({ productId, name?, description?, price?, currency?, portion?, confirmed? })`. Настройки кафе: `flow.updateOrganization({ name?, context?, tableFileId? })`.

## Статусы и повтор

`queued` → `running` → `succeeded` / `partial` / `failed`.

- `succeeded` означает успешную обработку, а не автоматическую публикацию: карточка всегда черновик и требует проверки.
- `partial`: текст сохранён, часть обогащения не выполнена. Новую генерацию можно явно запросить через `generateCard` с новым requestId; старая карточка остаётся доступной до получения новой.
- `failed`: `flow.retry(jobId)` повторяет задачу по явному действию администратора. Если Dify уже закончил ранее сохранённый run, backend восстанавливает его результат без нового вызова генерации.
- Одновременные генерации одного блюда запрещены; генерация других блюд возможна.
- Таймаут задачи переводит её в `failed`; запоздавший ответ старой попытки не перезапишет новую.
- Ключи Dify находятся только в environment Convex, JWT-ключи созданы на deployment. В браузер API-ключи не передаются.

## Проверка

```sh
cd frontend
npm run test:backend
npm run typecheck:backend
npm run build
RUN_BACKEND_E2E=1 PLAYWRIGHT_CHANNEL=chrome npx playwright test
```

17 серверных тестов: создание аккаунта/организации, login, неверный пароль, доступ между организациями, чужие файлы, идемпотентность, частичные результаты, таймауты/попытки, SSE, постоянное хранение сгенерированного изображения (mock провайдера). 4 браузерных теста, включая чтение настоящей dev-базы после входа.

Живая проверка: menu run сохранён в job, 78 блюд/5 категорий. Product run `5c3530cb-f84c-4540-9a46-eb3b0184530f` в Dify вернул `partial-succeeded`; текст восстановлен и сохранён, `processing.search=failed`, `processing.image=failed`. Для полноценной картинки нужно исправить/проверить HTTP-узлы и переменные Exa/x.ai в опубликованном Dify product. Workflow API key даёт запуск, а не доступ к его редактору. Новую платную генерацию после этой диагностики не запускали.

## Принятие карточки и публикация (2026-09-12)

После генерации `useProductCard(productId)` возвращает `card` с `_id`, `draftJson` и `imageUrl`. В `draftJson.product.translations.en` — английские имя и описание. Редактор может дать пользователю изменить их перед применением.

```tsx
const { applyCard } = useMenuWorkflows();
await applyCard({
  productId,
  cardId: product.card._id,
  reviewed: true, // пользователь нажал Apply после просмотра
  // name: editedEnglishName, description: editedEnglishDescription,
});
```

`applyCard` берёт английский текст из текущей карточки либо принимает отредактированные `name`/`description`. Сохраняет исходное имя в `originalName`, ставит `acceptedCardId`. Цена, валюта и подтверждённый состав/аллергены не заменяются AI-данными. Если идёт новая генерация или карточка устарела, операция отклоняется. Повторная генерация требует нового Apply.

```tsx
import { useMenuPublishing } from '@/hooks/use-menu-publishing';
const { publications, isLoading, publish, unpublish } = useMenuPublishing();
const { url, slug } = await publish({ menuId, name: 'My kafana', slug: 'my-kafana', reviewed: true });
// url: https://<текущий-домен>/menu/my-kafana — показываем ссылкой и кодируем в QR.
await unpublish(slug);
```

`publications` содержит `{ ...publication, url }` для активной организации, включая неопубликованные меню. Публикация не допускает активную генерацию или непринятую последнюю карточку. Она создаёт snapshot: последующие правки появляются у гостей после повторного Publish. Не требуется генерировать изображения для всех позиций перед публикацией.

Пути и JSX остаются задачей UI-участника; hooks готовы к подключению. Ошибки методов нужно ловить в форме, кнопку блокировать на время запроса. Веб-адрес определяется через `window.location.origin`, поэтому подходит для Render без зашитого localhost.

## Daytona PDF tasks

`useMenuPdf(menuId)` возвращает статус автоматической сборки, `pdfUrl`, `previewUrl`, `isStale`, `error` и `regenerate()`. `useMenuWorkflows.uploadMenuFile(file)` принимает JPG/PNG/PDF; лимит — 5 страниц/изображений на импорт. `useProducts(menuId).createProduct` связывает новое блюдо с выбранным меню и инициирует пересборку PDF. Контракт событий, настройки и подключение file input описаны в [daytona-pdf.md](daytona-pdf.md).
