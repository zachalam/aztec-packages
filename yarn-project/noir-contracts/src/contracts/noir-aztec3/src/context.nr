use dep::std;
use crate::abi;
use crate::abi::CallContext;
use crate::abi::ContractDeploymentData;
use crate::types::vec::BoundedVec;
use crate::utils::arr_copy_slice;

#[oracle(loadPrivateFunctionContext)]
fn load_private_function_context_oracle() -> [Field; 13] {}

unconstrained fn load_private_function_context_internal() -> [Field; 13] {
    load_private_function_context_oracle()
}

// When finished, one can call .finish() to convert back to the abi
struct PrivateFunctionContext {
    call_context : CallContext,

    old_private_data_tree_root : Field,
    old_nullifier_tree_root : Field,
    old_contract_tree_root : Field,

    contract_deployment_data: ContractDeploymentData,

    args : BoundedVec<Field, abi::MAX_ARGS>,
    return_values : BoundedVec<Field, abi::MAX_RETURN_VALUES>,
    logs : BoundedVec<Field, abi::MAX_LOGS>,

    new_commitments: BoundedVec<Field, abi::MAX_NEW_COMMITMENTS>,
    new_nullifiers: BoundedVec<Field, abi::MAX_NEW_NULLIFIERS>,

    private_call_stack : BoundedVec<Field, abi::MAX_PRIVATE_CALL_STACK>,
    public_call_stack : BoundedVec<Field, abi::MAX_PUBLIC_CALL_STACK>,
    l1_message_stack : BoundedVec<Field, abi::MAX_L1_MSG_STACK>,
}

impl PrivateFunctionContext {
    fn new() -> PrivateFunctionContext {
        let context_fields = load_private_function_context_internal();
        PrivateFunctionContext {
            call_context: CallContext::deserialize([
                context_fields[0],
                context_fields[1],
                context_fields[2],
                context_fields[3],
                context_fields[4],
                context_fields[5],
            ]),

            old_private_data_tree_root : context_fields[6],
            old_nullifier_tree_root : context_fields[7],
            old_contract_tree_root : context_fields[8],

            contract_deployment_data: ContractDeploymentData::deserialize([
                context_fields[9],
                context_fields[10],
                context_fields[11],
                context_fields[12],
            ]),

            args: BoundedVec::new(0),
            return_values: BoundedVec::new(0),
            logs: BoundedVec::new(0),

            new_commitments: BoundedVec::new(0),
            new_nullifiers: BoundedVec::new(0),

            private_call_stack: BoundedVec::new(0),
            public_call_stack: BoundedVec::new(0),
            l1_message_stack: BoundedVec::new(0),
        }
    }

    fn push_args(mut self: Self, args: [Field]) -> Self {
        self.args = self.args.push_array(args);
        self
    }

    // When noir uses user-defined serialization of fields, we can return public inputs instead
    fn finish(self) -> [Field; abi::PUBLIC_INPUTS_LENGTH] {
        let priv_circuit_pub_inputs = abi::PrivateCircuitPublicInputs {
            call_context: self.call_context,
            args: self.args.storage,
            return_values: self.return_values.storage,
            emitted_events: self.logs.storage,
            new_commitments: self.new_commitments.storage,
            new_nullifiers: self.new_nullifiers.storage,
            private_call_stack: self.private_call_stack.storage,
            public_call_stack: self.public_call_stack.storage,
            l1_msg_stack: self.l1_message_stack.storage,
            historic_private_data_tree_root: self.old_private_data_tree_root,
            historic_private_nullifier_tree_root: self.old_nullifier_tree_root,
            historic_contract_tree_root: self.old_contract_tree_root,
            contract_deployment_data: self.contract_deployment_data,
        };
        priv_circuit_pub_inputs.serialize()
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