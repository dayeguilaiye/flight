#!/usr/bin/env bash
# Run on the k3s host. Keep consistent SQLite snapshots and the matching master key.
set -euo pipefail
umask 077
destination="${1:-/var/backups/flight}"
mkdir -p "$destination"
exec 9>"$destination/.lock"
flock -n 9 || exit 0
snapshot="$(mktemp -d "$destination/.pending-XXXXXXXX")"
pod="$(kubectl -n flight get pods -l app=flight --field-selector=status.phase=Running -o jsonpath='{.items[0].metadata.name}')"
remote_db="/tmp/flight-backup-$(date -u +%Y%m%dT%H%M%SZ).sqlite3"
cleanup() {
  kubectl -n flight exec "$pod" -- rm -f "$remote_db" >/dev/null 2>&1 || true
  rm -rf "$snapshot"
}
trap cleanup EXIT
kubectl -n flight exec "$pod" -- sqlite3 /var/lib/flight/flight.sqlite3 ".timeout 10000" ".backup '$remote_db'"
test "$(kubectl -n flight exec "$pod" -- sqlite3 "$remote_db" 'PRAGMA integrity_check;')" = ok
kubectl -n flight exec "$pod" -- cat "$remote_db" > "$snapshot/flight.sqlite3"
kubectl -n flight get secret flight-runtime -o json > "$snapshot/runtime-secret.json"
# Include application-owned files; the database itself is the consistent snapshot above.
kubectl -n flight exec "$pod" -- tar -C /var/lib/flight \
  --exclude=flight.sqlite3 --exclude=flight.sqlite3-wal --exclude=flight.sqlite3-shm -czf - . > "$snapshot/files.tar.gz"
archive="$destination/flight-$(date -u +%Y%m%dT%H%M%SZ).tar.gz"
tar -C "$snapshot" -czf "$archive.partial" .
mv "$archive.partial" "$archive"
find "$destination" -maxdepth 1 -type f -name 'flight-*.tar.gz' -mtime +7 -delete
echo "Backup completed: $archive"
