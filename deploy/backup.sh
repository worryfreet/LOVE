#!/bin/sh
set -eu

backup_directory=${1:?请传入只允许备份用户写入的目标目录}
timestamp=$(date -u +%Y%m%dT%H%M%SZ)
mkdir -p "$backup_directory"
if docker compose version >/dev/null 2>&1; then
  compose_command='docker compose'
elif command -v docker-compose >/dev/null 2>&1; then
  compose_command='docker-compose'
else
  echo '未找到 Docker Compose' >&2
  exit 1
fi
$compose_command -p love -f /srv/love/current/docker-compose.production.yml exec -T database \
  pg_dump -U love -d love -Fc > "$backup_directory/love-$timestamp.dump"
test -s "$backup_directory/love-$timestamp.dump"
echo "$backup_directory/love-$timestamp.dump"
