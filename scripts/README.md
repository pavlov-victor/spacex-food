# Проверка Dify DSL

`dsl_lint.py` перенесён из соседнего проекта `kodland/eva-assistant/scripts/dsl_lint.py` (2026-09-12). Зависимость — PyYAML из `dsl/product/requirements-dev.txt`.

```sh
python3 -m pip install -r dsl/product/requirements-dev.txt
python3 scripts/dsl_lint.py --strict dsl/menu/0.0.3.yml dsl/product/0.0.6.yml
python3 scripts/test_dsl_lint.py
python3 dsl/product/test_workflow.py
```

Проверяет граф, ссылки на переменные, Python-код, входы/выходы, модель, HTTP fallback. `--json` даёт машинный отчёт; `--strict` считает предупреждения ошибками. Коды выхода: 0 — успешно, 1 — проблемы, 2 — файл не разобран.

Адаптации: необязательные аргументы `main` допустимы; `urllib.parse` не считается сетевым импортом; H04 проверяет JSON-строки для object/array fallback. Dify передаёт эти значения прямо в CodeEditor: объект `{}` вместо строки `'{}'` несовместим с редактором.

Исходники Dify, по которым проверен формат:
- https://github.com/langgenius/dify/blob/main/web/app/components/workflow/nodes/_base/components/error-handle/utils.ts
- https://github.com/langgenius/dify/blob/main/web/app/components/workflow/nodes/_base/components/error-handle/default-value.tsx

Линтер не заменяет импорт, открытие нод и запуск в конкретной версии Dify. Исторические snapshots сохраняются, поэтому полная проверка `dsl/product/*.yml` обнаружит H04 в старых версиях.

## Локальный DSL для импорта с ключами

```sh
python3 -m pip install -r dsl/product/requirements-dev.txt
python3 scripts/dsl_release.py dsl/product/0.0.7.yml
```

Создаёт рядом `0.0.7-release.yml`, подставляя из корневого `.env` только переменные, объявленные в `workflow.environment_variables`. Исходный DSL не меняется. Поддерживаются кавычки и `export` в `.env`; интерполяция выключена, значения ключей сохраняются буквально. Можно указать несколько исходных YAML и `--env /path/to/.env`.

`dsl/.gitignore` исключает `*-release.yml` во всех подпапках. Скрипт проверяет, что результат не отслеживается и исключён Git, пишет атомарно с правами 0600 и не выводит значения ключей. Без обязательного секрета сборка завершается ошибкой, существующий release при этом остаётся прежним. После изменения `.env` запустить команду заново. Ключи провайдера LLM в настройках Dify не входят в workflow environment: провайдер всё ещё должен быть настроен отдельно.
