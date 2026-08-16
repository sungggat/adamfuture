# ADAM Future — production stack

Профориентационная платформа с 36 вопросами и 744 профессиями. Frontend,
backend, PostgreSQL и внешний Nginx работают в отдельных контейнерах.

## Архитектура

```text
Browser → HTTPS Nginx → frontend (static React)
                    └→ backend (FastAPI) → PostgreSQL
                         └→ server-side calculation
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

Откройте `http://localhost`. В production ответы передаются только по HTTPS.

## Production HTTPS для adamfuture.kz

Предварительные условия:

1. A/AAAA-записи `adamfuture.kz` и `www.adamfuture.kz` направлены на сервер.
2. В firewall открыты TCP 80 и 443.
3. На сервере установлены Docker Engine и Docker Compose v2.
4. В `.env` заполнен реальный `LETSENCRYPT_EMAIL` и четыре случайных секрета.

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
docker compose exec -T postgres pg_dump -U adam -d adam -Fc > adam-backup.dump
```

Без `DATA_ENCRYPTION_KEY` расшифровать сохранённые ответы невозможно.

## Проверка кода

```bash
cd frontend
pnpm test
pnpm build
python3 -m py_compile ../backend/app/main.py
```
