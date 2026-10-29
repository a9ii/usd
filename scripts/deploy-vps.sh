#!/usr/bin/env bash
set -Eeuo pipefail

: "${APP_IMAGE:?APP_IMAGE is required}"
: "${BUILD_NUMBER:?BUILD_NUMBER is required}"

APP_NAME="${APP_NAME:-usd-site}"
HOST_PORT="${HOST_PORT:-3000}"
BIND_IP="${BIND_IP:-127.0.0.1}"

NEW_IMAGE="${APP_IMAGE}:release-${BUILD_NUMBER}"

PREVIOUS_IMAGE="$(
  docker inspect \
    --format='{{.Config.Image}}' \
    "$APP_NAME" 2>/dev/null || true
)"

start_container() {
  local image="$1"

  docker run -d \
    --name "$APP_NAME" \
    --restart unless-stopped \
    --publish "${BIND_IP}:${HOST_PORT}:3000" \
    --memory 768m \
    --cpus 1 \
    --pids-limit 256 \
    --tmpfs /tmp:rw,noexec,nosuid,size=64m \
    --cap-drop ALL \
    --security-opt no-new-privileges:true \
    "$image" >/dev/null
}

wait_healthy() {
  for attempt in {1..20}; do
    if curl -fsS --max-time 3 \
      "http://127.0.0.1:${HOST_PORT}/robots.txt" \
      >/dev/null; then
      return 0
    fi

    sleep 2
  done

  return 1
}

rollback() {
  echo "Attempting rollback..."

  docker rm -f "$APP_NAME" >/dev/null 2>&1 || true

  if [[ -z "$PREVIOUS_IMAGE" ]]; then
    echo "No previous production image is available." >&2
    return 1
  fi

  if ! start_container "$PREVIOUS_IMAGE"; then
    echo "CRITICAL: previous container could not start." >&2
    return 1
  fi

  if ! wait_healthy; then
    docker logs --tail 100 "$APP_NAME" >&2 || true
    echo "CRITICAL: rollback health check failed." >&2
    return 1
  fi

  echo "Rollback successful: $PREVIOUS_IMAGE"
}

echo "Deploying image: $NEW_IMAGE"

docker rm -f "$APP_NAME" >/dev/null 2>&1 || true

if ! start_container "$NEW_IMAGE"; then
  echo "New container failed to start." >&2
  rollback
  exit 1
fi

if wait_healthy; then
  echo "Production deployment successful."
  exit 0
fi

echo "New version failed its health check." >&2
docker logs --tail 100 "$APP_NAME" >&2 || true

rollback
exit 1
