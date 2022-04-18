#!/bin/bash

set -euxo pipefail

BASE_DIR="$(git rev-parse --show-toplevel)"
cd $BASE_DIR

IMAGE_NAME=jupyterlab-code-formatter-dev

# Console print helpers
info() {
	printf "\r\033[00;34m $1 \033[0m \n"
}

success() {
	printf "\r\033[2K  \033[00;32m $1 \033[0m \n"
}

# Dump lock file helper
_dump_lock_file() {
  temp_container_id=$(docker create $IMAGE_NAME)
  requirements_txt_in_host="dev/requirements.txt"
  requirements_txt_tar_in_host="${requirements_txt_in_host}.tar"
  requirements_txt_in_container="/app/requirements.txt"
  docker cp $temp_container_id:$requirements_txt_in_container - > $requirements_txt_tar_in_host
  tar -xf $requirements_txt_tar_in_host -C $(dirname $requirements_txt_in_host)
  rm $requirements_txt_tar_in_host
  docker rm -v $temp_container_id
}


info "Building docker container"
docker build -f dev/Dockerfile -t $IMAGE_NAME $BASE_DIR
success "Successfully built docker container"

info "Dumping lock files back into host"
_dump_lock_file
success "Dumped lock files back into host"
