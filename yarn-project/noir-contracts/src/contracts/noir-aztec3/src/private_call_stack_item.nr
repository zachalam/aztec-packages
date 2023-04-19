use crate::abi::PrivateCircuitPublicInputs;
use crate::utils::arr_copy_slice;

#[builtin(callPrivateFunction)]
fn call_private_function_internal(_contract_address: Field, _function_selector: Field, _args: [Field; crate::abi::MAX_ARGS]) -> [Field; 51] {}

struct FunctionData {
    function_selector: Field,
    is_private: bool,
    is_constructor: bool,
}

impl FunctionData {
    fn hash(self) -> Field {
        dep::std::hash::pedersen([
            // TODO hash_index
            self.function_selector,
            self.is_private as Field,
            self.is_constructor as Field,
        ])[0]
    }
}

struct PrivateCallStackItem {
    contract_address: Field,
    function_data: FunctionData,
    public_inputs: PrivateCircuitPublicInputs,
}

impl PrivateCallStackItem {
    fn call(contract_address: Field, function_selector: Field, args: [Field; crate::abi::MAX_ARGS]) -> Self {
        let fields = call_private_function_internal(contract_address, function_selector, args);
        let item = PrivateCallStackItem {
            contract_address: fields[0],
            function_data: FunctionData {
                function_selector: fields[1],
                is_private: fields[2] as bool,
                is_constructor: fields[3] as bool,
            },
            public_inputs: PrivateCircuitPublicInputs::deserialize(arr_copy_slice(fields, [0; crate::abi::PUBLIC_INPUTS_LENGTH], 4)),
        };
        constrain contract_address == item.contract_address;
        constrain function_selector == item.function_data.function_selector;
        for i in 0..crate::abi::MAX_ARGS {
            constrain args[i] == item.public_inputs.args[i];
        };

        item
    }

    fn hash(self) -> Field {
        dep::std::hash::pedersen([
            // TODO hash_index
            self.contract_address,
            self.function_data.hash(),
            self.public_inputs.hash(),
        ])[0]
    }
}