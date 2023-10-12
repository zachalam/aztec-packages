#!/bin/bash

# Compiles Aztec.nr contracts in parallel, bubbling any compilation errors

self_path=$(realpath "$0")
self_dir=$(dirname "$self_path")
source "$self_dir/scripts/catch.sh"

# Error flag file
error_file="/tmp/error.$$"
# Array of child PIDs
pids=()

# Set SIGCHLD handler
trap handle_sigchld SIGCHLD # Trap any ERR signal and call the custom error handler

COMPILER="$self_dir/../../noir-compiler/dest/cli.js"

build() {
  CONTRACT_NAME=$1
  CONTRACT_FOLDER="$self_dir/../src/contracts/${CONTRACT_NAME}_contract"
  echo "Compiling $CONTRACT_NAME..."
  rm -rf ${CONTRACT_FOLDER}/target

  # If the compilation fails, rerun the compilation with 'nargo' and show the compiler output.
  node "$COMPILER" contract "$CONTRACT_FOLDER"
}

# Build contracts
for CONTRACT_NAME in "$@"; do
  build $CONTRACT_NAME &
  pids+=($!)
done

# Wait for all background processes to finish
wait

# If error file exists, exit with error
if [ -f "$error_file" ]; then
    rm "$error_file"
    echo "Error occurred in one or more child processes. Exiting..."
    exit 1
fi
