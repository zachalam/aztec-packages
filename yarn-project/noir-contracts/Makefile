# Helper to compile noir contracts in parallel
# List all contracts to compile with `make -j lending uniswap` etc
# Note this has no dependency checking
# TODO(AD): Move to incremental build from noir, why do we need to rm -rf target?

%: 
	@echo "Compiling $*"
	cd src/contracts/$@_contract && nargo compile
