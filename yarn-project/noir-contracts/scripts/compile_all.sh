#!/bin/bash
# Compiles all noir contracts

# Runs the compile scripts for all contracts.
echo "Compiling all contracts"

COMPILER="$(realpath $(dirname $0)/../../noir-compiler/dest/cli.js)"
CONTRACTS="$(realpath $(dirname $0)/../src/contracts)"

for contract in $CONTRACTS/*; do
  node "$COMPILER" contract "$contract"
done
