#!/usr/bin/env bash
set -Eeuo pipefail

image_uri="$1"
aws_region="$2"
memory_limit="$3"
registry="${image_uri%%/*}"
service_name="alphaday-home"
candidate_name="${service_name}-candidate"
previous_image=""

remove_candidate() {
  docker rm --force "$candidate_name" >/dev/null 2>&1 || true
}

trap remove_candidate EXIT

if docker inspect "$service_name" >/dev/null 2>&1; then
  previous_image="$(docker inspect --format '{{.Config.Image}}' "$service_name")"
fi

aws ecr get-login-password --region "$aws_region" |
  docker login --username AWS --password-stdin "$registry"
docker pull "$image_uri"
remove_candidate
docker run --detach \
  --memory "$memory_limit" \
  --name "$candidate_name" \
  --publish 127.0.0.1:3001:3000 \
  "$image_uri"

for _ in $(seq 1 30); do
  if curl --fail --silent http://127.0.0.1:3001/robots.txt >/dev/null; then
    break
  fi
  sleep 2
done
curl --fail --silent http://127.0.0.1:3001/robots.txt >/dev/null
remove_candidate
docker rm --force "$service_name" >/dev/null 2>&1 || true
docker run --detach \
  --memory "$memory_limit" \
  --name "$service_name" \
  --publish 3000:3000 \
  --restart unless-stopped \
  "$image_uri"

for _ in $(seq 1 30); do
  if curl --fail --silent http://127.0.0.1:3000/robots.txt >/dev/null; then
    docker image prune --all --force --filter until=168h
    exit 0
  fi
  sleep 2
done

docker rm --force "$service_name" >/dev/null 2>&1 || true
if [ -n "$previous_image" ]; then
  docker run --detach \
    --memory "$memory_limit" \
    --name "$service_name" \
    --publish 3000:3000 \
    --restart unless-stopped \
    "$previous_image"
fi
exit 1
