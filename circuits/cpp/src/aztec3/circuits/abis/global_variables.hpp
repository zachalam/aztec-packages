#pragma once
#include "function_data.hpp"
#include "tx_context.hpp"

#include "aztec3/utils/array.hpp"
#include "aztec3/utils/types/circuit_types.hpp"
#include "aztec3/utils/types/convert.hpp"
#include "aztec3/utils/types/native_types.hpp"

#include <barretenberg/barretenberg.hpp>

namespace aztec3::circuits::abis {

using aztec3::utils::types::CircuitTypes;
using aztec3::utils::types::NativeTypes;

template <typename NCT> struct GlobalVariables {
    using address = typename NCT::address;
    using fr = typename NCT::fr;
    using boolean = typename NCT::boolean;

    fr chain_id = 0;
    fr version = 0;
    fr block_number = 0;
    fr timestamp = 0;

    MSGPACK_FIELDS(chain_id, version, block_number, timestamp);

    boolean operator==(GlobalVariables<NCT> const& other) const
    {
        return chain_id == other.chain_id && version == other.version && block_number == other.block_number &&
               timestamp == other.timestamp;
    };

    template <typename Builder> GlobalVariables<CircuitTypes<Builder>> to_circuit_type(Builder& builder) const
    {
        static_assert((std::is_same<NativeTypes, NCT>::value));

        // Capture the builder:
        auto to_ct = [&](auto& e) { return aztec3::utils::types::to_ct(builder, e); };
        auto to_circuit_type = [&](auto& e) { return e.to_circuit_type(builder); };

        GlobalVariables<CircuitTypes<Builder>> globals = {
            to_ct(chain_id),
            to_ct(version),
            to_ct(block_number),
            to_ct(timestamp),
        };

        return globals;
    };

    fr hash() const
    {
        std::vector<fr> inputs;
        inputs.push_back(chain_id);
        inputs.push_back(version);
        inputs.push_back(block_number);
        inputs.push_back(timestamp);

        return NCT::compress(inputs, GeneratorIndex::GLOBAL_VARIABLES);
    }

    // TODO(Maddiaa): is this cursed? The linter is shouting at me for doing pointer arithmetic.
    std::array<uint8_t, 32 * 4> to_bytes() const
    {
        std::array<uint8_t, 32 * 4> buf;

        auto* ptr = buf.begin();
        chain_id.to_buffer().copy(ptr, ptr += 32);
        version.to_buffer().copy(ptr, ptr += 32);
        block_number.to_buffer().copy(ptr, ptr += 32);
        timestamp.to_buffer().copy(ptr, ptr += 32);
        return buf;
    }
};

template <typename NCT> void read(uint8_t const*& it, GlobalVariables<NCT>& globals)
{
    using serialize::read;

    read(it, globals.chain_id);
    read(it, globals.version);
    read(it, globals.block_number);
    read(it, globals.timestamp);
};

template <typename NCT> void write(std::vector<uint8_t>& buf, GlobalVariables<NCT> const& globals)
{
    using serialize::write;

    write(buf, globals.chain_id);
    write(buf, globals.version);
    write(buf, globals.block_number);
    write(buf, globals.timestamp);
};

template <typename NCT> std::ostream& operator<<(std::ostream& os, GlobalVariables<NCT> const& globals)
{
    return os << "chain_id: " << globals.chain_id << "\n"
              << "version: " << globals.version << "\n"
              << "block_number: " << globals.block_number << "\n"
              << "timestamp: " << globals.timestamp << "\n";
}

}  // namespace aztec3::circuits::abis