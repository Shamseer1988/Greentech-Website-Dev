#!/bin/bash
# Saves the database to /var/backups/greentech and keeps the last 7 days. Run as root.
set -euo pipefail
umask 077
DIR=/var/backups/greentech
mkdir -p "$DIR"
FILE="$DIR/greentech-$(date +%F-%H%M).dump"
cd /
runuser -u postgres -- pg_dump --format=custom greentech > "$FILE.part"
mv "$FILE.part" "$FILE"
find "$DIR" -name 'greentech-*.dump' -mtime +7 -delete
echo "Saved $FILE ($(du -h "$FILE" | cut -f1))"
