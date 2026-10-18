# ADAM Future — production stack

Профориентационная платформа с 36 вопросами и 744 профессиями. Frontend,
backend, PostgreSQL и внешний Nginx работают в отдельных контейнерах.

## Архитектура

```text
Browser → HTTPS Nginx → frontend (static React)
                    └→ backend (FastAPI) → PostgreSQL
                         └→ server-side calculation
                         └→ OpenAI Responses API (optional interpretation)
                         └→ private PDF volume
```

- Регистрация и логин не требуются.
- Frontend отправляет ответы только один раз после завершения всех 36 вопросов.
- Результат рассчитывает только backend; браузерный fallback отсутствует.
- Ответы шифруются Fernet перед записью в PostgreSQL.
- IP-адрес не сохраняется: для rate-control записывается необратимый HMAC.
- Публичного `GET` результата нет. Результат возвращается только в ответе на
  завершение теста и не сохраняется в localStorage/sessionStorage.
- PostgreSQL доступен только во внутренней Docker-сети.
- Nginx ограничивает размер и частоту запросов, включает security headers и TLS.

## Локальный демо-кабинет без backend

```bash
cd frontend
pnpm install
pnpm dev
```

Откройте `http://localhost:5173/login`.

- локальный код ученика: `ADAM-STUDENT-7K9M-4Q2X-8V6P`
- локальный код администратора: `ADAM-ADMIN-X7Q9-M4VK-2P8C-6R5T`

Эти значения больше не показываются на странице входа. Они предназначены
только для локальной разработки и не являются production-паролями.

В этом режиме пользователи, лицензионные коды, анкеты и результаты хранятся
только в `localStorage` текущего браузера. Администратор может создавать коды,
видеть результаты и вести заметки. Пользователь получает оформленный отчёт:
кнопка «Скачать PDF» открывает системную печать, где нужно выбрать
«Сохранить как PDF».

Это локальный MVP, а не production-аутентификация. Перед публикацией необходимо
перенести пользователей, лицензии и результаты в PostgreSQL, хранить коды в
хешированном виде и использовать серверные сессии.

## Локальный Docker-запуск

Создайте секреты (каждый должен быть уникальным):

```bash
cp .env.example .env
openssl rand -hex 32
openssl rand -hex 32
openssl rand -hex 32
openssl rand -hex 32
```

Запишите значения в `.env` для `POSTGRES_PASSWORD`, `ADMIN_API_KEY`,
`PRIVACY_SECRET` и `DATA_ENCRYPTION_KEY`, затем:

```bash
docker compose up --build
```

### Краткая AI-интерпретация в отчёте

Интерпретация является дополнительным слоем над детерминированным расчётом:
модель не меняет баллы и список профессий. Без API результат и PDF продолжают
работать с локальным текстом. Чтобы включить улучшенную двуязычную формулировку,
создайте новый ключ и добавьте его только в серверный `.env`:

```bash
OPENAI_API_KEY=your-new-server-side-key
OPENAI_MODEL=gpt-5
```

Не добавляйте реальный ключ в Git, frontend-переменные `VITE_*` или Dockerfile.
Backend отправляет в OpenAI только 36 обезличенных ответов, рассчитанные шкалы
и учебные предпочтения — без профессий, ФИО, телефона, школы и других
персональных данных. Ответ запрашивается через
Structured Outputs и не сохраняется OpenAI-запросом (`store: false`).

Откройте `http://localhost`. В production ответы передаются только по HTTPS.

## Production HTTPS для adamfuture.kz

Предварительные условия:

1. A/AAAA-записи `adamfuture.kz` и `www.adamfuture.kz` направлены на сервер.
2. В firewall открыты TCP 80 и 443.
3. На сервере установлены Docker Engine и Docker Compose v2.
4. Создан закрытый `.env`, заполнены `LETSENCRYPT_EMAIL` и новый OpenAI API key.

Подготовка окружения:

```bash
chmod +x scripts/create-production-env.sh scripts/backup-production.sh
./scripts/create-production-env.sh
nano .env
```

Скрипт создаёт разные криптографически случайные значения и файл с правами
`600`. Никогда не коммитьте `.env`. Ключ, который когда-либо был отправлен в
чат или опубликован, необходимо отозвать и заменить новым.

Первичный выпуск сертификата и запуск production:

```bash
chmod +x scripts/init-letsencrypt.sh
./scripts/init-letsencrypt.sh
```

Скрипт сначала поднимает HTTP-конфигурацию для ACME challenge, выпускает один
сертификат Let's Encrypt для `adamfuture.kz` + `www.adamfuture.kz`, затем
переключает Nginx на HTTPS. Контейнер `certbot-renew` проверяет продление каждые
12 часов, Nginx перечитывает сертификаты каждые 6 часов.

Обычное production-обновление после первого выпуска:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Проверка:

```bash
curl -I https://adamfuture.kz
curl https://adamfuture.kz/api/health
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs --tail=100
```

## Статистика

```bash
curl -H "Authorization: Bearer $ADMIN_API_KEY" \
  https://adamfuture.kz/api/admin/stats
```

Ответ содержит общее число завершённых тестов и прохождения за последние 24
часа. Admin API защищён длинным bearer-токеном и отдельным rate limit.

## Резервное копирование

Перед обновлениями сохраняйте БД и `.env`/ключ шифрования отдельно:

```bash
./scripts/backup-production.sh
```

Скрипт сохраняет PostgreSQL и приватный Docker volume `reports_data`. PDF
загружаются и скачиваются только через защищённый Admin API:

```bash
curl -X POST -H "Authorization: Bearer $ADMIN_API_KEY" \
  -H "Content-Type: application/pdf" --data-binary @report.pdf \
  https://adamfuture.kz/api/admin/reports/STUDENT_ID

curl -H "Authorization: Bearer $ADMIN_API_KEY" \
  https://adamfuture.kz/api/admin/reports
```

Без `DATA_ENCRYPTION_KEY` расшифровать сохранённые ответы невозможно.

## Важная граница текущей версии

Docker, TLS, база тестирований, AI-интерпретация и приватное PDF-хранилище
подготовлены для сервера. Однако кабинет с лицензионными кодами из раздела
«Локальный демо-кабинет» всё ещё является browser-local MVP. Его демонстрационные
коды нельзя считать production-аутентификацией. До открытия кабинета реальным
пользователям необходимо перенести лицензии и сессии в backend с HttpOnly-cookie;
не публикуйте демонстрационный admin-код как рабочий доступ.

## Проверка кода

```bash
cd frontend
pnpm test
pnpm build
python3 -m py_compile ../backend/app/main.py
```
