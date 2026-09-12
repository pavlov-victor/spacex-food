# Видео для SpaceX Hackathon Belgrade — 2 минуты

Режиссура на русском, речь и надписи на английском для международной аудитории. Название в кадре: **SpaceX Food** (заменить, если команда выберет другое).

## Перед записью

- Открыть рабочий сайт на Render, проверить вход и свежий тестовый ресторан. Публичное меню проверять на телефоне без CRM-сессии.
- Подготовить бумажное меню или его фото, фото стола и фактическое фото Karađorđeva. Файлы брать из resources.
- Не показывать Dify console, `.env`, API-ключи или терминал. В кадре демонстрируется продукт.
- Сгенерировать резервные результаты заранее. В записи длительное ожидание можно сократить монтажом с пометкой “Generation time shortened”. Не изображать подготовленную картинку как мгновенный ответ.
- Перед съёмкой убедиться, что UI-участник подключил Login, Import, Generate, Apply и Publish. Готовые hooks сами по себе кнопки не создают.
- Для двух бейджей в демонстрационном ресторане явно отметить **Served hot** и **Takeaway available** перед генерацией. Не ставить Vegan для мясного блюда. Это демонстрационные настройки, а не подтверждение реального ресторана.
- Состав показывать как требующий проверки, если его не было в бумажном меню. Не обещать автоматически достоверные аллергены.

## Покадровый план

| Время | Что делаем / камера | Озвучка на английском | Надпись в кадре |
| --- | --- | --- | --- |
| 0:00–0:10 | Общий план стола в кафане. Переводим камеру на бумажное меню, приближаем цены и сербские названия. | “Great food deserves a menu everyone can understand. But for many restaurants, updating a paper menu means more work—and guests still struggle to choose.” | Paper menu → Digital experience |
| 0:10–0:20 | Переходим к записи экрана. Регистрируем демонстрационный ресторан, показываем его название. Загружаем фото стола в настройки. | “This is SpaceX Food, built for Serbian kafanas and restaurants. First, the owner creates a restaurant and adds a photo of their table.” | 1. Create your restaurant |
| 0:20–0:35 | Наводим камеру телефона на меню и делаем фото. Склейка на CRM: выбираем именно это фото, видим превью, нажимаем Import. | “Next, take a photo of the menu and upload it. The workflow extracts dishes, categories, and prices into an editable digital menu.” | 2. Upload a menu photo |
| 0:35–0:48 | Показываем результат: категории, цены в RSD, несколько позиций. Останавливаемся на Karađorđeva. Показываем редактируемое поле. | “Everything stays editable. The owner can check the prices, correct a name, and review anything the AI could not read confidently.” | Review and edit |
| 0:48–1:05 | Открываем блюдо без карточки. Подтверждаем демо-свойства, нажимаем Generate. После монтажного сокращения показываем английское описание и иллюстрацию. | “Now we open one dish and generate an English description and a visual card. Recipe details and dietary claims remain under the restaurant’s control.” | 3. Enrich one dish |
| 1:05–1:22 | Крупно показываем фотографию реального готового блюда. Загружаем её в карточку, нажимаем Regenerate. Затем сравнение до/после. | “Once the actual dish is ready, the staff uploads a real photo. We use it as a reference to create a polished presentation inspired by the restaurant’s own table.” | Real dish photo → Restyled card |
| 1:22–1:35 | Показываем результат целиком. Проверяем имя, описание и бейджи. Нажимаем Apply, затем Publish. Появляются ссылка и QR. | “The owner reviews the result, applies the changes, and publishes the menu. A single link and QR code connect it to the guests.” | 4. Review. Apply. Publish. |
| 1:35–1:52 | Снимаем вторым телефоном: сканируем QR. Без авторизации открывается меню. Листаем категории, открываем блюдо крупно. | “Guests scan the code on their phone, browse the menu, and open a dish to see its description and image. No restaurant account is needed to view the menu.” | Scan. Browse. Choose. |
| 1:52–2:00 | Финальный кадр: телефон с меню рядом с реальной тарелкой. Небольшая строка стека. | “From a paper menu to a digital dining experience. SpaceX Food—built at SpaceX Hackathon Belgrade.” | Built with Dify · Grok · fal.ai · Convex · Render |

## Текст озвучки одним блоком

Great food deserves a menu everyone can understand. But for many restaurants, updating a paper menu means more work—and guests still struggle to choose.

This is SpaceX Food, built for Serbian kafanas and restaurants. First, the owner creates a restaurant and adds a photo of their table.

Next, take a photo of the menu and upload it. The workflow extracts dishes, categories, and prices into an editable digital menu.

Everything stays editable. The owner can check the prices, correct a name, and review anything the AI could not read confidently.

Now we open one dish and generate an English description and a visual card. Recipe details and dietary claims remain under the restaurant’s control.

Once the actual dish is ready, the staff uploads a real photo. We use it as a reference to create a polished presentation inspired by the restaurant’s own table.

The owner reviews the result, applies the changes, and publishes the menu. A single link and QR code connect it to the guests.

Guests scan the code on their phone, browse the menu, and open a dish to see its description and image. No restaurant account is needed to view the menu.

From a paper menu to a digital dining experience. SpaceX Food—built at SpaceX Hackathon Belgrade.

## Если выступаем вживую

Один человек рассказывает, второй управляет экраном. Ожидание генерации заполняем рассказом о проверке владельцем. Держим уже опубликованное демо-меню открытым в соседней вкладке и честно называем его заранее подготовленным примером, если сеть подведёт. Не генерируем все 78 блюд: для истории достаточно одной позиции и одной перегенерации.
