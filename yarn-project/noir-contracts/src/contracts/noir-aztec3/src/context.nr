use crate::notes::value_note::Note;
use crate::types::vec::BoundedVec;
use crate::private_call_stack_item::PrivateCallStackItem;
use crate::abi;

struct PrivateFunctionExecutionContext {
    inputs: abi::Inputs,
    public_inputs: abi::PrivateCircuitPublicInputs,

    return_values : BoundedVec<Field, abi::MAX_RETURN_VALUES>,
    logs : BoundedVec<Field, abi::MAX_LOGS>,

    new_commitments: BoundedVec<Field, abi::MAX_NEW_COMMITMENTS>,
    new_nullifiers: BoundedVec<Field, abi::MAX_NEW_NULLIFIERS>,

    private_call_stack : BoundedVec<Field, abi::MAX_PRIVATE_CALL_STACK>,
    public_call_stack : BoundedVec<Field, abi::MAX_PUBLIC_CALL_STACK>,
    l1_message_stack : BoundedVec<Field, abi::MAX_L1_MSG_STACK>,
}

impl PrivateFunctionExecutionContext {
    fn new(inputs: abi::Inputs, serialized_public_inputs: [Field; abi::PUBLIC_INPUTS_LENGTH]) -> PrivateFunctionExecutionContext {
        PrivateFunctionExecutionContext {
            inputs,
            // TODO This will be removed when we have user-defined serialization of structs
            public_inputs: abi::PrivateCircuitPublicInputs::deserialize(serialized_public_inputs),

            return_values: BoundedVec::new(0),
            logs: BoundedVec::new(0),

            new_commitments: BoundedVec::new(0),
            new_nullifiers: BoundedVec::new(0),

            private_call_stack: BoundedVec::new(0),
            public_call_stack: BoundedVec::new(0),
            l1_message_stack: BoundedVec::new(0),
        }
    }

    fn call_private_function(mut self: Self, contract_address: Field, function_selector: Field, args: [Field; crate::abi::MAX_ARGS]) -> (PrivateCallStackItem, Self) {
        let item = PrivateCallStackItem::call(contract_address, function_selector, args);
        self.private_call_stack = self.private_call_stack.push(item.hash());
        (item, self)
    }

    fn finish(self) {
        let computed_public_inputs = abi::PrivateCircuitPublicInputs {
            call_context: self.inputs.call_context,
            args: self.inputs.args,
            return_values: self.return_values.storage,
            emitted_events: self.logs.storage,
            new_commitments: self.new_commitments.storage,
            new_nullifiers: self.new_nullifiers.storage,
            private_call_stack: self.private_call_stack.storage,
            public_call_stack: self.public_call_stack.storage,
            l1_msg_stack: self.l1_message_stack.storage,
            historic_private_data_tree_root: self.inputs.old_private_data_tree_root,
            historic_private_nullifier_tree_root: self.inputs.old_nullifier_tree_root,
            historic_contract_tree_root: self.inputs.old_contract_tree_root,
            contract_deployment_data: self.inputs.contract_deployment_data,
        };

        computed_public_inputs.constrain_equality(self.public_inputs);
    }

    fn push_new_note_hash(mut self: Self, note_hash: Field) -> Self {
        self.new_commitments = self.new_commitments.push(note_hash);
        self
    }

    fn push_new_nullifier(mut self: Self, nullifier: Field) -> Self {
        self.new_nullifiers = self.new_nullifiers.push(nullifier);
        self
    }
}
