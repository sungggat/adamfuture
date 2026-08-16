#!/bin/sh
set -eu

if [ ! -f .env ]; then
  echo "Create .env from .env.example first" >&2
  exit 1
fi

set -a
. ./.env
set +a

if [ -z "${LETSENCRYPT_EMAIL:-}" ]; then
  echo "LETSENCRYPT_EMAIL is required in .env" >&2
  exit 1
fi

docker compose up -d --build postgres backend frontend nginx
docker compose --profile tls run --rm certbot certonly \
  --webroot --webroot-path /var/www/certbot \
  --email "$LETSENCRYPT_EMAIL" --agree-tos --no-eff-email \
  -d adamfuture.kz -d www.adamfuture.kz
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

echo "HTTPS is ready at https://adamfuture.kz"
