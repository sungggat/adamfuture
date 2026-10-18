#!/bin/sh
set -eu

cd "$(dirname "$0")/.."
if [ -e .env ]; then
  echo ".env already exists; refusing to overwrite it." >&2
  exit 1
fi

umask 077
postgres_password="$(openssl rand -hex 32)"
admin_api_key="$(openssl rand -hex 32)"
privacy_secret="$(openssl rand -hex 32)"
encryption_key="$(openssl rand -hex 32)"

sed \
  -e "s/replace-with-64-random-hex-characters/$postgres_password/" \
  -e "s/replace-with-admin-random-hex/$admin_api_key/" \
  -e "s/replace-with-privacy-random-hex/$privacy_secret/" \
  -e "s/replace-with-encryption-random-hex/$encryption_key/" \
  .env.production.example > .env

echo "Created .env with mode 600. Add OPENAI_API_KEY and verify LETSENCRYPT_EMAIL."
