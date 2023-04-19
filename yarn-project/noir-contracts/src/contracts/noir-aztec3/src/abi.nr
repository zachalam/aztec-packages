global MAX_ARGS: comptime Field = 8;
global MAX_RETURN_VALUES: comptime Field = 4;
global MAX_LOGS: comptime Field = 4;
global MAX_NEW_COMMITMENTS: comptime Field = 4;
global MAX_NEW_NULLIFIERS: comptime Field = 4;
global MAX_PRIVATE_CALL_STACK : comptime Field = 4;
global MAX_PUBLIC_CALL_STACK: comptime Field = 4;
global MAX_L1_MSG_STACK : comptime Field = 2;
global PUBLIC_INPUTS_LENGTH : comptime Field = 47;

use crate::types::vec::BoundedVec;
use crate::utils::arr_copy_slice;

// Inputs are expected to be provided to each contract function
struct Inputs {
    call_context : CallContext,

    old_private_data_tree_root : Field,
    old_nullifier_tree_root : Field,
    old_contract_tree_root : Field,

    contract_deployment_data: ContractDeploymentData,
    args: [Field; MAX_ARGS],
}

struct CallContext {
    msg_sender : Field,
    storage_contract_address : Field,
    portal_contract_address : Field,

    is_delegate_call : bool,
    is_static_call : bool,
    is_contract_deployment: bool,
}

impl CallContext {
    fn serialize(self) -> [Field; 6] {
        [
            self.msg_sender,
            self.storage_contract_address,
            self.portal_contract_address,
            self.is_delegate_call as Field,
            self.is_static_call as Field,
            self.is_contract_deployment as Field,
        ]
    }

    fn constrain_equality(self, another: CallContext) {
        let self_serialized = self.serialize();
        let another_serialized = another.serialize();

        for i in 0..self_serialized.len(){
            constrain self_serialized[i] == another_serialized[i];
        }
    }
}

struct ContractDeploymentData {
    constructor_vk_hash : Field,
    function_tree_root : Field,
    contract_address_salt : Field,
    portal_contract_address : Field,
}

impl ContractDeploymentData {
    fn serialize(self) -> [Field; 4] {
        [
            self.constructor_vk_hash,
            self.function_tree_root,
            self.contract_address_salt,
            self.portal_contract_address,
        ]
    }

    fn constrain_equality(self, another: ContractDeploymentData) {
        let self_serialized = self.serialize();
        let another_serialized = another.serialize();

        for i in 0..self_serialized.len(){
            constrain self_serialized[i] == another_serialized[i];
        }
    }
}

struct PrivateCircuitPublicInputs {
    call_context: CallContext,
    args: [Field; crate::abi::MAX_ARGS],
    return_values: [Field; crate::abi::MAX_RETURN_VALUES],
    emitted_events: [Field; crate::abi::MAX_LOGS],
    new_commitments: [Field; crate::abi::MAX_NEW_COMMITMENTS],
    new_nullifiers: [Field; crate::abi::MAX_NEW_NULLIFIERS],
    private_call_stack: [Field; crate::abi::MAX_PRIVATE_CALL_STACK],
    public_call_stack: [Field; crate::abi::MAX_PUBLIC_CALL_STACK],
    l1_msg_stack: [Field; crate::abi::MAX_L1_MSG_STACK],
    historic_private_data_tree_root: Field,
    historic_private_nullifier_tree_root: Field,
    historic_contract_tree_root: Field,
    contract_deployment_data: ContractDeploymentData,
}

impl PrivateCircuitPublicInputs {
    // TODO hash_index
    fn hash(self) -> Field {
        dep::std::hash::pedersen(self.serialize())[0]
    }

    fn serialize(self) -> [Field; PUBLIC_INPUTS_LENGTH] {
        let mut fields: BoundedVec<Field, PUBLIC_INPUTS_LENGTH> = BoundedVec::new(0); 
        fields = fields.push_array(self.call_context.serialize());   
        fields = fields.push_array(self.args);
        fields = fields.push_array(self.return_values);
        fields = fields.push_array(self.emitted_events);
        fields = fields.push_array(self.new_commitments);
        fields = fields.push_array(self.new_nullifiers);
        fields = fields.push_array(self.private_call_stack);
        fields = fields.push_array(self.public_call_stack);
        fields = fields.push_array(self.l1_msg_stack);
        fields = fields.push(self.historic_private_data_tree_root);
        fields = fields.push(self.historic_private_nullifier_tree_root);
        fields = fields.push(self.historic_contract_tree_root);
        fields = fields.push_array(self.contract_deployment_data.serialize());
        fields.storage
    }

    fn deserialize(fields: [Field; PUBLIC_INPUTS_LENGTH]) -> PrivateCircuitPublicInputs {
        PrivateCircuitPublicInputs {
            call_context: CallContext {
                msg_sender : fields[0],
                storage_contract_address : fields[1],
                portal_contract_address : fields[2],

                is_delegate_call : fields[3] as bool,
                is_static_call : fields[4] as bool,
                is_contract_deployment: fields[5] as bool
            },
            // TODO handle the offsets as a variable incremented during extraction?
            args: arr_copy_slice(fields, [0; crate::abi::MAX_ARGS], 6),
            return_values: arr_copy_slice(fields, [0; crate::abi::MAX_RETURN_VALUES], 14),
            emitted_events: arr_copy_slice(fields, [0; crate::abi::MAX_LOGS], 18),
            new_commitments: arr_copy_slice(fields, [0; crate::abi::MAX_NEW_COMMITMENTS], 22),
            new_nullifiers: arr_copy_slice(fields, [0; crate::abi::MAX_NEW_NULLIFIERS], 26),
            private_call_stack: arr_copy_slice(fields, [0; crate::abi::MAX_PRIVATE_CALL_STACK], 30),
            public_call_stack: arr_copy_slice(fields, [0; crate::abi::MAX_PUBLIC_CALL_STACK], 34),
            l1_msg_stack:arr_copy_slice(fields, [0; crate::abi::MAX_L1_MSG_STACK], 38),
            historic_private_data_tree_root: fields[40],
            historic_private_nullifier_tree_root: fields[41],
            historic_contract_tree_root: fields[42],
            contract_deployment_data: ContractDeploymentData {
                constructor_vk_hash : fields[43],
                function_tree_root : fields[44],
                contract_address_salt : fields[45],
                portal_contract_address : fields[46],
            },
        }
    }

    fn constrain_equality(self, another: PrivateCircuitPublicInputs){
        let another_serialized = another.serialize();
        let self_serialized = self.serialize();
        for i in 0..self_serialized.len() {
            constrain self_serialized[i] == another_serialized[i];
        }
    }
}
