mod storage;

contract Simple {
    // Libs
    use dep::aztec::{
        abi,
        abi::PrivateContextInputs,
        context::Context,
        log::emit_unencrypted_log,
        note::{
            note_header::NoteHeader,
            utils as note_utils,
        },
    };
    use crate::storage::Storage;

    fn constructor(
        //*********************************/
        // Should eventually be hidden:
        inputs: PrivateContextInputs,
    ) -> distinct pub abi::PrivateCircuitPublicInputs {
        let mut context = Context::new(inputs, abi::hash_args([]));
        context.finish()
    }

    fn set(
        //*********************************/
        // Should eventually be hidden:
        inputs: PrivateContextInputs,
        //*********************************/
        value: u120, 
        private_state_viewer: Field,
    ) -> distinct pub abi::PrivateCircuitPublicInputs {
        let mut context = Context::new(inputs, abi::hash_args([value as Field, private_state_viewer]));
        let storage = Storage::init();
        let balances = storage.balances;

        balances.at(0).add(&mut context, value, private_state_viewer);
        emit_unencrypted_log(&mut context, "Balance set in constructor");

        // Return private circuit public inputs. All private functions need to return this as it is part of the input of the private kernel.
        context.finish()
    }

    // balances: Map<Account, Field>;
    // fn set(
    //     value: u120, 
    //     private_state_viewer: Field,
    // ) -> distinct pub abi::PrivateCircuitPublicInputs {
    //     balances.at(0).add(value, private_state_viewer);
    //     context.emit_unencrypted_log( "Balance set in constructor");
    // }
}