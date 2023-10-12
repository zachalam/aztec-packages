#!/bin/bash
# Script to install noirup and the latest aztec nargo
set -eu

# install compatible nargo version
VERSION="${VERSION:-$(jq -r '.dependencies."@noir-lang/noir_wasm"' ../noir-compiler/package.json)}"

# Install nargo
noirup -v $VERSION
