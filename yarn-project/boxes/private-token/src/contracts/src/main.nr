contract PrivateToken {
    use dep::std::option::Option;
    use dep::value_note::{
        balance_utils,
        utils::{increment, decrement},
        value_note::{VALUE_NOTE_LEN, ValueNote, ValueNoteMethods},
    };
    use dep::aztec::{
        context::{PrivateContext, PublicContext, Context},
        note::{
            note_header::NoteHeader,
            utils as note_utils,
        },
        state_vars::{map::Map, set::Set},
    };

    struct Storage {
        // maps an aztec address to its balance
        balances: Map<Set<ValueNote, VALUE_NOTE_LEN>>,
    }

    impl Storage {
        fn init(context: Context) -> pub Self {
            Storage {
                balances: Map::new(
                    context,
                    1, // Storage slot
                    |context, slot| {
                        Set::new(context, slot, ValueNoteMethods)
                    },
                ),
            }
        }
    }

    // Constructs the contract and sets `initial_supply` which is fully owned by `owner`.
    #[aztec(private)]
    fn constructor(
        initial_supply: Field, 
        owner: Field
    )  {
        
        // Insert new note to a set of user notes and emit the newly created encrypted note preimage via oracle call.
        let owner_balance = storage.balances.at(owner);
        if (initial_supply != 0) {
            increment(owner_balance, initial_supply, owner);
        }
    }

    // Mints `amount` of tokens to `owner`.
    #[aztec(private)]
    fn mint(
        amount: Field, 
        owner: Field
    )  {
        

        // Insert new note to a set of user notes and emit the newly created encrypted note preimage via oracle call.
        let owner_balance = storage.balances.at(owner);
        increment(owner_balance, amount, owner);
    }

    // Transfers `amount` of tokens from msg_sender to a `recipient`.
    #[aztec(private)]
    fn transfer(
        amount: Field, 
        recipient: Field,
    )  {
        
        let sender = context.msg_sender();

        // Pick from the set of sender's notes to spend amount.
        let sender_balance = storage.balances.at(sender);
        decrement(sender_balance, amount, sender);

        // Creates new note for the recipient.
        let recipient_balance = storage.balances.at(recipient);
        increment(recipient_balance, amount, recipient);
    }

    // Helper function to get the balance of a user ("unconstrained" is a Noir alternative of Solidity's "view" function).
    unconstrained fn getBalance(
        owner: Field,
    ) -> Field {
        

        // Get the set of notes owned by the user.
        let owner_balance = storage.balances.at(owner);

        // Return the sum of all notes in the set.
        balance_utils::get_balance(owner_balance)
    }

    // Computes note hash and nullifier.
    // Note 1: Needs to be defined by every contract producing logs.
    // Note 2: Having it in all the contracts gives us the ability to compute the note hash and nullifier differently for different kind of notes.
    unconstrained fn compute_note_hash_and_nullifier(contract_address: Field, nonce: Field, storage_slot: Field, preimage: [Field; VALUE_NOTE_LEN]) -> [Field; 4] {
        let note_header = NoteHeader::new(contract_address, nonce, storage_slot);
        note_utils::compute_note_hash_and_nullifier(ValueNoteMethods, note_header, preimage)
    }
}