#!/usr/bin/env bash
# Create scoped deployment access and preserve the application secret across reruns.
set -euo pipefail
host="${1:?Usage: deploy/bootstrap.sh SSH_HOST PUBLIC_IP}"
ip="${2:?Usage: deploy/bootstrap.sh SSH_HOST PUBLIC_IP}"
cd "$(dirname "$0")/.."
ssh "$host" kubectl apply -f - < deploy/access.yaml
ssh "$host" kubectl apply -f - < deploy/storage.yaml
ssh "$host" bash -s <<'REMOTE'
set -euo pipefail
if ! kubectl -n flight get secret flight-runtime >/dev/null 2>&1; then
  umask 077
  secret_file="$(mktemp)"
  trap 'rm -f "$secret_file"' EXIT
  printf 'FLIGHT_ADMIN_PASSWORD=%s\nFLIGHT_MASTER_KEY=%s\n' \
    "$(openssl rand -hex 24)" "$(openssl rand -hex 32)" > "$secret_file"
  kubectl -n flight create secret generic flight-runtime --from-env-file="$secret_file"
fi
REMOTE

# Credentials travel only through the encrypted SSH connection and stdin to gh.
ssh "$host" bash -s -- "$ip" <<'REMOTE' | gh secret set FLIGHT_KUBECONFIG --repo dayeguilaiye/flight
set -euo pipefail
ip="$1"
for _ in $(seq 1 30); do
  token="$(kubectl -n flight get secret flight-deployer-token -o jsonpath='{.data.token}' | base64 -d)"
  [ -n "$token" ] && break
  sleep 1
done
test -n "$token"
ca="$(kubectl -n flight get secret flight-deployer-token -o jsonpath='{.data.ca\.crt}')"
test -n "$ca"
cat <<CONFIG
apiVersion: v1
kind: Config
clusters:
  - name: flight
    cluster:
      server: https://${ip}:6443
      certificate-authority-data: ${ca}
      tls-server-name: kubernetes
contexts:
  - name: flight
    context:
      cluster: flight
      namespace: flight
      user: flight-deployer
current-context: flight
users:
  - name: flight-deployer
    user:
      token: ${token}
CONFIG
REMOTE
echo 'Flight storage, runtime secret and GitHub FLIGHT_KUBECONFIG are ready.'
