use crate::abi::PrivateCircuitPublicInputs;
use crate::utils::arr_copy_slice;

// TODO unconstrained functions fail with arrays as arguments
#[oracle(callPrivateFunction)]
fn call_private_function_oracle(
    _contract_address: Field, 
    _function_selector: Field, 
    _arg0: Field,
    _arg1: Field,
    _arg2: Field,
    _arg3: Field,
    _arg4: Field,
    _arg5: Field,
    _arg6: Field,
    _arg7: Field,
) -> [Field; 51] {}

unconstrained fn call_private_function_internal(
    contract_address: Field, 
    function_selector: Field,
    arg0: Field,
    arg1: Field,
    arg2: Field,
    arg3: Field,
    arg4: Field,
    arg5: Field,
    arg6: Field,
    arg7: Field,
) -> [Field; 51] {
    call_private_function_oracle(
        contract_address, 
        function_selector, 
        arg0,
        arg1,
        arg2,
        arg3,
        arg4,
        arg5,
        arg6,
        arg7,
    )
}

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
        let fields = call_private_function_internal(
            contract_address, 
            function_selector, 
            args[0],
            args[1],
            args[2],
            args[3],
            args[4],
            args[5],
            args[6],
            args[7]
        );
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