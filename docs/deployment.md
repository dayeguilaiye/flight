# Deployment and recovery

Flight runs at `https://www.hitnrun.cn` on the existing Tencent Cloud k3s server (`tengxun`, `43.136.135.35`, Linux amd64). Traefik terminates HTTPS and cert-manager uses the `lets-encrypt` ClusterIssuer. The DNS A record for `www.hitnrun.cn` points to this server.

## Release flow

`.github/workflows/deploy.yml` verifies pull requests. Application and deployment changes pushed to `main` trigger verification, image publication to `ghcr.io/dayeguilaiye/flight`, and a Helm upgrade in namespace `flight`. **Actions → Flight → Run workflow**, selecting `main`, also starts a release.

Verification runs the frontend tests and production build, `go vet`, race-enabled Go tests, golangci-lint, Helm lint and shell syntax checks. The image contains the frontend and Go API in one executable, plus CA certificates and the SQLite backup tool. Builds target Linux amd64; the frontend and Go compiler run on the builder's native architecture.

The publish job tags images with `sha-<commit>`; Helm deploys the returned immutable digest. Jobs are serialized per branch, and a queued deployment checks that its commit is still the current `main`. The workflow waits for readiness, then checks HTTPS, `/api/health`, frontend deep links and a JavaScript asset.

## First installation

Prerequisites: an SSH alias for the server, a signed-in GitHub CLI account with repository secret access, k3s with its `local-path` StorageClass, Helm 3, Traefik and the certificate issuer above.

```bash
bash deploy/bootstrap.sh tengxun 43.136.135.35
```

Bootstrap creates:

- The `flight` namespace and its `flight-deployer` service account, restricted to that namespace.
- The `flight-data` PVC, managed separately from application Helm releases.
- A `flight-runtime` Secret containing randomly generated `FLIGHT_ADMIN_PASSWORD` and `FLIGHT_MASTER_KEY`. Reruns preserve an existing Secret.
- The GitHub Actions secret `FLIGHT_KUBECONFIG`. Credentials pass through SSH and standard input without being printed.

The first Actions publication creates a private GHCR package. In GitHub, open the **flight package → Package settings → Change visibility → Public**, then rerun the failed deploy job. The workflow checks anonymous image access before updating the server. This public package matches the public source repository and lets k3s pull images without a personal access token. See [GitHub Container registry documentation](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry).

For a first local installation before the workflow is pushed, build and import the image into the single k3s node, then deploy the chart:

```bash
release_tag="bootstrap-$(date -u +%Y%m%dT%H%M%SZ)"
docker buildx build --platform linux/amd64 --load \
  -t "ghcr.io/dayeguilaiye/flight:$release_tag" .
docker save "ghcr.io/dayeguilaiye/flight:$release_tag" | gzip | \
  ssh tengxun 'gzip -d | sudo k3s ctr images import -'
tar -czf - -C deploy flight | ssh tengxun 'mkdir -p ~/flight-deploy && tar -xzf - -C ~/flight-deploy'
ssh tengxun "helm upgrade flight ~/flight-deploy/flight --install --namespace flight --set image.tag=$release_tag --wait --timeout 5m"
```

Use a new bootstrap tag for every changed build. Imported bootstrap images live on that node; the first successful Actions release replaces this reference with a registry digest.

After the first pod binds the PVC, preserve its underlying volume even if the claim is accidentally removed:

```bash
ssh tengxun 'pv=$(kubectl -n flight get pvc flight-data -o jsonpath="{.spec.volumeName}"); kubectl patch pv "$pv" -p '\''{"spec":{"persistentVolumeReclaimPolicy":"Retain"}}'\'''
```

Validate the installation:

```bash
ssh tengxun 'kubectl -n flight get pods,pvc,certificate'
bash scripts/smoke.sh https://www.hitnrun.cn
```

While a local resolver still caches an earlier DNS address, run `FLIGHT_SMOKE_RESOLVE=www.hitnrun.cn:443:43.136.135.35 bash scripts/smoke.sh https://www.hitnrun.cn`. This selects the destination IP while retaining normal hostname and TLS certificate verification. CI uses public DNS.

## Runtime and storage

`FLIGHT_DATA_DIR=/var/lib/flight` holds the SQLite database and all durable files. The `local-path` PVC uses server-local disk. Its requested 2 GiB is a provisioning request, not an enforced directory quota; monitor the host's free disk space.

The deployment has one replica and uses `Recreate`: an upgrade stops the old process before starting the new one. This causes a brief interruption and keeps startup migrations sequential. Readiness and liveness use `/api/health`; this endpoint checks HTTP process responsiveness. Startup must finish database initialization and migrations before HTTP starts.

The container runs as UID/GID 10001 with a read-only root filesystem, a writable data volume and a 64 MiB temporary volume. It requests 64 MiB RAM and has a 256 MiB limit. `FLIGHT_SECURE_COOKIES=true` marks login cookies HTTPS-only behind Traefik; local HTTP development defaults to false.

Retrieve the owner password when needed without committing it:

```bash
ssh tengxun 'kubectl -n flight get secret flight-runtime -o jsonpath="{.data.FLIGHT_ADMIN_PASSWORD}" | base64 -d'
```

Keep the master key with the database backup: saved provider API keys depend on it for decryption. Changing the administrator password requires restarting the deployment; existing sessions remain valid until expiration unless the signing key changes. Changing the master key also affects encrypted provider credentials and requires an explicit data migration.

## Backups

Install and immediately test the daily backup:

```bash
bash deploy/install-backup.sh tengxun
ssh tengxun 'sudo systemctl status flight-backup.timer --no-pager; sudo journalctl -u flight-backup.service -n 20 --no-pager'
```

The timer runs at approximately 04:00 server time (Asia/Shanghai, UTC+8), catches up after downtime, and retains archives for seven days under `/var/backups/flight`. The script takes a consistent SQLite online backup, checks integrity, archives other files from the data root, and includes the matching runtime Secret. Archives are readable only by root. Failures are visible in the systemd service status and journal.

These snapshots protect against application/data mistakes on a working server. Keep another copy outside the server for recovery from disk or host loss. For example, stream an archive to a protected local directory:

```bash
umask 077
mkdir -p "$HOME/.local/share/flight/backups"
ssh tengxun 'sudo cat /var/backups/flight/flight-YYYYMMDDTHHMMSSZ.tar.gz' \
  > "$HOME/.local/share/flight/backups/flight-YYYYMMDDTHHMMSSZ.tar.gz"
```

A snapshot contains `flight.sqlite3`, `runtime-secret.json` and `files.tar.gz`. To restore, stop the Flight deployment, mount its PVC in a maintenance pod, replace the database and durable files from one snapshot, remove stale SQLite WAL/SHM files, and restore the matching Secret. Run a compatible application image, start the deployment and repeat the HTTPS smoke test. Test recovery on an isolated volume before replacing production data.

## Rollback and troubleshooting

```bash
ssh tengxun 'helm history flight -n flight'
ssh tengxun 'kubectl -n flight get pods; kubectl -n flight get events --sort-by=.lastTimestamp'
ssh tengxun 'kubectl -n flight logs deploy/flight --tail=100'
```

For a release whose database schema remains compatible with the previous application:

```bash
ssh tengxun 'helm rollback flight REVISION -n flight --wait --timeout 5m'
bash scripts/smoke.sh https://www.hitnrun.cn
```

Schema migrations are forward-only. Review migration compatibility before rollback; restore a matching snapshot when necessary. A failed rollout retains its release history and diagnostic state for this decision.

Helm uninstall leaves the separately managed PVC and runtime Secret intact. Keep the namespace and PVC for retained data. The backup archive also contains credentials; handle it as a secret.

To rotate CI access, delete only `flight-deployer-token`, then rerun `deploy/bootstrap.sh`. That revokes the old token and updates the GitHub secret. The application secret remains unchanged.
