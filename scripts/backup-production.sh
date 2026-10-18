#!/bin/sh
set -eu

cd "$(dirname "$0")/.."
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_dir="${BACKUP_DIR:-./backups}/$timestamp"
mkdir -p "$backup_dir"
chmod 700 "$backup_dir"

docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U adam -d adam -Fc > "$backup_dir/postgres.dump"
docker run --rm -v adamfuture_reports_data:/source:ro -v "$(cd "$backup_dir" && pwd):/backup" \
  alpine:3.22 tar -czf /backup/reports.tar.gz -C /source .

echo "Backup written to $backup_dir"
