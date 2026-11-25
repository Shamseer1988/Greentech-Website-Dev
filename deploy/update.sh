#!/bin/bash
# Installs the newest version from GitHub. Run as root: bash /opt/greentech/app/deploy/update.sh
set -euo pipefail
APP=/opt/greentech/app
as_app() { runuser -u greentech -- env HOME=/opt/greentech PATH=/opt/greentech/.local/bin:/usr/local/bin:/usr/bin:/bin "$@"; }

main() {
  echo "== Backup"
  bash "$APP/deploy/backup.sh"

  echo "== New code"
  as_app git -C "$APP" pull --ff-only

  echo "== Backend"
  cd "$APP/backend"
  as_app uv pip install --quiet -r requirements.txt
  as_app .venv/bin/alembic upgrade head

  echo "== Website (a few minutes)"
  cd "$APP/frontend"
  as_app npm ci --no-audit --no-fund
  as_app env NODE_OPTIONS=--max-old-space-size=1792 npm run build

  echo "== Restart"
  cp "$APP"/deploy/greentech-*.service "$APP"/deploy/greentech-*.timer /etc/systemd/system/
  systemctl daemon-reload
  systemctl restart greentech-backend greentech-frontend
  for _ in $(seq 1 30); do
    if curl -fsS -o /dev/null http://127.0.0.1:8000/api/health && curl -fsS -o /dev/null http://127.0.0.1:3000/; then
      echo "Done: the website is running."
      exit 0
    fi
    sleep 2
  done
  echo "The website does not answer. See: journalctl -u greentech-backend -u greentech-frontend -n 80" >&2
  exit 1
}

# In a function, so a change of this file by "git pull" cannot disturb the running script.
main
