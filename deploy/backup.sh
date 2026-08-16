#!/bin/sh
set -eu

backup_directory=${1:?请传入只允许备份用户写入的目标目录}
timestamp=$(date -u +%Y%m%dT%H%M%SZ)
mkdir -p "$backup_directory"
docker compose -p love -f /srv/love/current/docker-compose.production.yml exec -T database \
  pg_dump -U love -d love -Fc > "$backup_directory/love-$timestamp.dump"
test -s "$backup_directory/love-$timestamp.dump"
echo "$backup_directory/love-$timestamp.dump"
