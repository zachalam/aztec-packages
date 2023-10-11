// TODO(@zac-wiliamson #2341 delete this file and rename c_bind_new to c_bind once we have migrated to new hash standard

#pragma once
#include "barretenberg/common/wasm_export.hpp"
#include "barretenberg/ecc/curves/bn254/fr.hpp"

extern "C" {

using namespace barretenberg;

WASM_EXPORT void pedersen__init();

WASM_EXPORT void pedersen__compress_fields(fr::in_buf left, fr::in_buf right, fr::out_buf result);
WASM_EXPORT void pedersen__plookup_compress_fields(fr::in_buf left, fr::in_buf right, fr::out_buf result);

WASM_EXPORT void pedersen__compress(fr::vec_in_buf inputs_buffer, fr::out_buf output);
WASM_EXPORT void pedersen__plookup_compress(fr::vec_in_buf inputs_buffer, fr::out_buf output);

WASM_EXPORT void pedersen__compress_with_hash_index(fr::vec_in_buf inputs_buffer,
                                                    uint32_t const* hash_index,
                                                    fr::out_buf output);

WASM_EXPORT void pedersen__commit(fr::vec_in_buf inputs_buffer, fr::out_buf output);
WASM_EXPORT void pedersen__plookup_commit(fr::vec_in_buf inputs_buffer, fr::out_buf output);
WASM_EXPORT void pedersen__plookup_commit_with_hash_index(fr::vec_in_buf inputs_buffer,
                                                          uint32_t const* hash_index,
                                                          fr::out_buf output);

WASM_EXPORT void pedersen__buffer_to_field(uint8_t const* data, fr::out_buf r);
}