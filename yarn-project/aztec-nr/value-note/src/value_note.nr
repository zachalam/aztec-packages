use dep::aztec::note::{
    note_header::NoteHeader,
    note_interface::NoteInterface,
    utils::compute_note_hash_for_read_or_nullify,
};
use dep::aztec::oracle::{
    rand::rand,
    get_secret_key::get_secret_key,
};

global VALUE_NOTE_LEN: Field = 3; // 3 plus a header.

// docs:start:value-note-def
struct ValueNote {
    value: Field,
    owner: Field,
    randomness: Field,
    header: NoteHeader,
}
// docs:end:value-note-def

impl ValueNote {
    pub fn new(value: Field, owner: Field) -> Self {
        let randomness = rand();
        let header = NoteHeader::empty();
        ValueNote {
            value,
            owner,
            randomness,
            header,
        }
    }

    pub fn serialize(self) -> [Field; VALUE_NOTE_LEN] {
        [self.value, self.owner, self.randomness]
    }

    pub fn deserialize(preimage: [Field; VALUE_NOTE_LEN]) -> Self {
        ValueNote {
            value: preimage[0],
            owner: preimage[1],
            randomness: preimage[2],
            header: NoteHeader::empty(),
        }
    }

    pub fn compute_note_hash(self) -> Field {
        // TODO(#1205) Should use a non-zero generator index.
        dep::std::hash::pedersen([
            self.value, 
            self.owner,
            self.randomness,
        ])[0]
    }

    // docs:start:nullifier

    pub fn compute_nullifier(self) -> Field {
        let note_hash_for_nullify = compute_note_hash_for_read_or_nullify(ValueNoteMethods, self);
        let secret = get_secret_key(self.owner);
        // TODO(#1205) Should use a non-zero generator index.
        dep::std::hash::pedersen([
            note_hash_for_nullify,
            secret.low,
            secret.high,
        ])[0]
    }

    // docs:end:nullifier

    pub fn set_header(&mut self, header: NoteHeader) {
        self.header = header;
    }
}

fn deserialize(preimage: [Field; VALUE_NOTE_LEN]) -> ValueNote {
    ValueNote::deserialize(preimage)
}

fn serialize(note: ValueNote) -> [Field; VALUE_NOTE_LEN] {
    note.serialize()
}

fn compute_note_hash(note: ValueNote) -> Field {
    note.compute_note_hash()
}

fn compute_nullifier(note: ValueNote) -> Field {
    note.compute_nullifier()
}

fn get_header(note: ValueNote) -> NoteHeader {
    note.header
}

fn set_header(note: &mut ValueNote, header: NoteHeader) {
    note.set_header(header)
}

global ValueNoteMethods = NoteInterface {
    deserialize,
    serialize,
    compute_note_hash,
    compute_nullifier,
    get_header,
    set_header,
};
