#!/bin/bash
# Downloads the image that contains the built scripts package and executes the given command in it.
[ -n "${BUILD_SYSTEM_DEBUG:-}" ] && set -x # conditionally trace
set -eu

export PATH="$PATH:$(git rev-parse --show-toplevel)/build-system/scripts"

ecr_login

REPO="yarn-project"
retry docker pull $(calculate_image_uri $REPO)
retry docker tag $(calculate_image_uri $REPO) aztecprotocol/$REPO:latest

docker run ${DOCKER_RUN_OPTS:-} --rm aztecprotocol/$REPO:latest $@