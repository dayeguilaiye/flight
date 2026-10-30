#!/usr/bin/env bash
set -euo pipefail
host="${1:?Usage: deploy/install-backup.sh SSH_HOST}"
cd "$(dirname "$0")"
ssh "$host" 'sudo install -m 700 /dev/stdin /usr/local/sbin/flight-backup' < backup.sh
ssh "$host" 'sudo install -m 644 /dev/stdin /etc/systemd/system/flight-backup.service' < flight-backup.service
ssh "$host" 'sudo install -m 644 /dev/stdin /etc/systemd/system/flight-backup.timer' < flight-backup.timer
ssh "$host" 'sudo systemctl daemon-reload && sudo systemctl enable --now flight-backup.timer && sudo systemctl start flight-backup.service'
