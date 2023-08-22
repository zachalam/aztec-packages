
use dep::std;
use dep::aztec::abi;
use dep::aztec::state_vars::public_state::PublicState;
use dep::aztec::abi::PrivateContextInputs;
use dep::aztec::abi::PublicContextInputs;
use dep::aztec::context::PrivateContext;
use dep::aztec::types::point::Point;
use dep::aztec::public_call_stack_item::PublicCallStackItem;
use dep::aztec::note::note_getter::NoteGetterOptions;
use dep::value_note::filter::{get_max_notes, get_1_note};
use dep::aztec::types::type_serialisation::field_serialisation::FieldSerialisationMethods;
use dep::aztec::types::type_serialisation::field_serialisation::FIELD_SERIALISED_LEN;

// oracles
use dep::std::option::Option;
use dep::aztec::oracle::get_secret_key::get_secret_key;
use dep::aztec::log::emit_encrypted_log;
use dep::aztec::oracle::get_public_key::get_public_key;
use dep::aztec::state_vars::map::Map;
use dep::aztec::state_vars::singleton::Singleton;
use dep::aztec::state_vars::set::Set;

use dep::value_note::{
    balance_utils,
    value_note::{
        ValueNote,
        ValueNoteMethods,
        VALUE_NOTE_LEN,
    },
};

global MAX_CARDS = 2; // Limited by square root of read requests (max 4, so 2)

struct Card {
    inner: Field,
}

impl Card {
    fn default() -> Self {
        Card {
            inner: 1
        }
    }
    fn id(self) -> Field {
        self.inner
    }
    fn dummy() -> Self {
        Card {
            inner: 0
        }
    }
    fn is_dummy(self) -> bool {
        self.inner == 0
    }
    fn points(self) -> u8 {
        self.inner.to_le_bytes(32)[0]
    }
    fn strength(self) -> u8 {
        self.inner.to_le_bytes(32)[1]
    }
}

fn user_cards_private_storage() -> Map<Singleton<ValueNote, VALUE_NOTE_LEN>> {
    Map::new(1, |s| Singleton::new(s, ValueNoteMethods))
}
fn user_decks_private_storage() -> Map<Singleton<ValueNote, VALUE_NOTE_LEN>> {
    Map::new(2, |s| Singleton::new(s, ValueNoteMethods))
}
fn deck_strength_public_storage() -> Map<PublicState<Field, FIELD_SERIALISED_LEN>> {
    Map::new(3, |s| PublicState::new(s, FieldSerialisationMethods))
}
fn user_plays_public_storage() -> Map<PublicState<Field, FIELD_SERIALISED_LEN>> {
    Map::new(4, |s| PublicState::new(s, FieldSerialisationMethods))
}
fn player_order_public_storage() -> Map<PublicState<Field, FIELD_SERIALISED_LEN>> {
    Map::new(5, |s| PublicState::new(s, FieldSerialisationMethods))
}
fn played_cards_public_storage() -> Map<PublicState<Field, FIELD_SERIALISED_LEN>> {
    Map::new(6, |s| PublicState::new(s, FieldSerialisationMethods))
}
fn winning_card_public_storage() -> Map<PublicState<Field, FIELD_SERIALISED_LEN>> {
    Map::new(7, |s| PublicState::new(s, FieldSerialisationMethods))
}
fn game_points_public_storage() -> Map<PublicState<Field, FIELD_SERIALISED_LEN>> {
    Map::new(8, |s| PublicState::new(s, FieldSerialisationMethods))
}
fn winning_user_public_storage() -> Map<PublicState<Field, FIELD_SERIALISED_LEN>> {
    Map::new(9, |s| PublicState::new(s, FieldSerialisationMethods))
}
fn user_points_public_storage() -> Map<PublicState<Field, FIELD_SERIALISED_LEN>> {
    Map::new(10, |s| PublicState::new(s, FieldSerialisationMethods))
}
fn winner_public_storage() -> Map<PublicState<Field, FIELD_SERIALISED_LEN>> {
    Map::new(11, |s| PublicState::new(s, FieldSerialisationMethods))
}
fn user_pub_key_public_storage() -> Map<PublicState<Field, FIELD_SERIALISED_LEN>> {
    Map::new(12, |s| PublicState::new(s, FieldSerialisationMethods))
}

fn user_collection_insert(context: &mut PrivateContext, owner: Field, card: Card) {
    let card_entry = user_cards_private_storage().at(card.id());
    let mut card_note = ValueNote::new(1, owner);
    if card_entry.is_initialised() {
        let old_card = card_entry.get_note(context);
        card_note = ValueNote::new(old_card.value + 1, owner);
        card_entry.replace(context,  &mut card_note);
    } else {
        card_entry.initialise(context, &mut card_note);
    }

    emit_encrypted_log(
        context,
        (*context).this_address(),
        card_entry.storage_slot,
        get_public_key(owner),
        card_note.serialise(),
    );
}

//TODO HACK needed why can't comptime decay to normal Field when passed to pedersen?
fn user_deck_insert(context: &mut PrivateContext, owner: Field, game_id: Field, i_hack_comptime : Field, i : Field, user_cards: [Card; MAX_CARDS])  {
    let mut card_note = ValueNote::new(user_cards[i_hack_comptime].id(), owner);
    let idx = std::hash::pedersen([owner, game_id, i])[0];
    user_decks_private_storage().at(idx).replace(context, &mut card_note)
}

fn user_deck_get(context: &mut PrivateContext, owner: Field, game_id: Field, i: Field) -> ValueNote {
    let idx = std::hash::pedersen([owner, game_id, i])[0];
    user_decks_private_storage().at(idx).get_note(context)
}

global y = 1;
fn x<T>(x: T) -> T {
    x
}

fn assert_own_card(
    context: &mut PrivateContext,
    card: Card, 
    owner: Field
) {
    let card_entry = user_cards_private_storage().at(card.id()).get_note(context);
    assert(card_entry.owner == owner);
    assert(card_entry.value != 0);
}
