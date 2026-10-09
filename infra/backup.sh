#!/bin/sh
# Nightly encrypted database backup. Run from cron on the server, e.g.:
#   15 2 * * *  cd /srv/himasaleh && sh infra/backup.sh >> /var/log/himasaleh-backup.log 2>&1
# Restore test (do it monthly — an untested backup is not a backup):
#   openssl enc -d -aes-256-cbc -pbkdf2 -pass env:BACKUP_PASSPHRASE -in FILE | gunzip | psql ...
set -eu
cd "$(dirname "$0")"
. ./.env
DEST=${BACKUP_DIR:-/var/backups/himasaleh}
KEEP_DAYS=${BACKUP_KEEP_DAYS:-14}
mkdir -p "$DEST"
FILE="$DEST/hm-$(date +%Y%m%d-%H%M%S).sql.gz.enc"
docker compose -f docker-compose.yml exec -T postgres pg_dump -U hm hm \
  | gzip \
  | BACKUP_PASSPHRASE="$BACKUP_PASSPHRASE" openssl enc -aes-256-cbc -pbkdf2 -salt -pass env:BACKUP_PASSPHRASE -out "$FILE"
find "$DEST" -name 'hm-*.sql.gz.enc' -mtime +"$KEEP_DAYS" -delete
# Off-server copy, if the AWS CLI is configured for your S3 service.
if command -v aws >/dev/null 2>&1 && [ -n "${BACKUP_S3_URI:-}" ]; then
  aws s3 cp "$FILE" "$BACKUP_S3_URI/" --endpoint-url "$S3_ENDPOINT"
fi
echo "backup ok: $FILE"
