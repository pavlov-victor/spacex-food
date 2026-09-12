# Daytona: PDF меню и импорт страниц

Реализовано 2026-09-12. Оркестрация распознавания остаётся в существующем Dify workflow. Convex scheduler запускает отдельные Daytona-задачи работы с PDF. Новый Dify DSL не требуется: в `menu_images` поступают обычные HTTPS URL PNG.

## Автоматическая пересборка

События: завершение импорта меню, добавление блюда в меню, изменение/удаление блюда, принятие карточки, переименование меню, публикация/снятие публикации (обновление QR).

Мутация атомарно увеличивает `pdfRevision` и ставит задачу на +3 секунды. Последовательные правки объединяются: задача старой ревизии не запускается. Если старый worker уже работает, результат проверяется перед сохранением и удаляется при устаревании. После ошибки предыдущий PDF остаётся доступен с `isStale: true`; есть ручной retry. Watchdog переводит зависшую генерацию в failed через 8 минут.

Daytona получает только данные меню и фиксированный Python-обработчик. HTML экранируется; пользовательские скрипты не исполняются. Создаются A4 PDF с переносом на следующие страницы и PNG-превью первой страницы. Печатаются текущие сохранённые названия/описания/цены, без новой LLM-генерации и выдуманной валюты. QR включается только при существующей публикации и настроенном `PUBLIC_APP_URL`. Переводам соответствует уже принятая карточка: отдельного переключения языка печати пока нет.

Файлы переносятся в Convex Storage до удаления sandbox. Старые артефакты удаляются после успешной замены. Публичный сайт меню сохраняет явную публикацию: правки черновика автоматически обновляют PDF, а посетитель видит последнюю опубликованную версию сайта.

## Импорт PDF

`files.upload` принимает `application/pdf` только для `kind: menu`; проверяет `%PDF-` и размер до 10 MB. Фотографии стола/блюда остаются JPG/PNG.

До вызова Dify `menuPdf.prepareImport` загружает исходный PDF в Daytona и превращает его страницы в PNG по порядку. Максимальная сторона 2400 px, масштаб не выше 2x. PNG сохраняются в Convex, идентификаторы записываются в `jobs.preparedFileIds` и используются повторно при retry Dify. Оригинальный PDF остаётся в `menus.fileIds`.

**Лимит текущего MVP — 5 страниц/изображений суммарно на один импорт**, включая несколько PDF и обычные фотографии. Превышение, повреждённый или запароленный PDF заканчиваются ошибкой задачи; частичное меню не создаётся. Автоматическая пакетная обработка более пяти страниц требует отдельного расширения Dify-потока. PDF для печати может иметь больше пяти страниц (до 100); такой документ пока нельзя целиком импортировать обратно одним запуском.

## Контракт UI

UI и компоненты принадлежат дизайнеру; этот этап добавляет backend и hooks.

```tsx
const pdf = useMenuPdf(menuId); // @/hooks/use-menu-pdf
// status: idle | queued | running | succeeded | failed
// pdfUrl, previewUrl, isStale, error, revision, generatedRevision, updatedAt
await pdf.regenerate();

const workflows = useMenuWorkflows();
const fileId = await workflows.uploadMenuFile(file); // JPG / PNG / PDF
await workflows.importMenu(name, [fileId]);
await workflows.renameMenu(menuId, 'Dinner');
await workflows.deleteProduct(productId);
```

В существующем file input добавить `application/pdf,.pdf` к accept и обновить подпись лимита. Метод `uploadImage(file, "menu")` сохранён и также поддерживает PDF. `useProducts(menuId).createProduct(...)` теперь привязывает блюдо к выбранному меню, что запускает пересборку. При создании без menuId блюдо остаётся в общем каталоге.

Показывать старую ссылку во время обработки можно, но с пометкой устаревшей версии (`isStale`). Кнопка PDF и file input ещё требуют подключения в компонентах дизайнера.

## Конфигурация и проверка

Секрет `DAYTONA_API_KEY` установить в environment выбранного Convex deployment. Опциональные переменные:

- `DAYTONA_SNAPSHOT`: готовый Python snapshot с зависимостями из `daytona/requirements.txt` для ускорения; без него используется стандартный Python sandbox и pip install.
- `PUBLIC_APP_URL`: реальный HTTPS origin фронтенда для QR, например адрес Render. Не подставлять временный URL Daytona.

Sandbox имеет auto-stop 5 минут и auto-delete после остановки; удаляется в finally после выполнения. SDK находится только в Node action и не попадает в клиентский bundle. Сообщения SDK с возможными credentials не пишутся в ошибки задач.

Локальная проверка обработчика:

```sh
python3 -m venv daytona/.venv
daytona/.venv/bin/pip install -r daytona/requirements.txt
daytona/.venv/bin/python -m unittest discover -s daytona -p 'test_*.py'
python3 daytona/sync-worker.py
cd frontend
npm run typecheck:backend
npm run test:backend
npm run build
```

Живой smoke с синтетическим меню (без Dify-вызовов и записи в базу), читает корневой `.env`:

```sh
cd frontend
node scripts/smoke-daytona.mjs
```

Артефакты и время успешного запуска записываются в `daytona/runs/`, исключённый из Git. До успешного smoke не считать интеграцию проверенной на Daytona.

Документация: [Daytona SDK](https://www.daytona.io/docs/en/typescript-sdk/), [PyMuPDF Story](https://pymupdf.readthedocs.io/en/latest/story-class.html).
