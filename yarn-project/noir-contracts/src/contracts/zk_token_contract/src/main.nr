contract ZkToken {
    use dep::aztec3::abi;
    use dep::aztec3::abi::Inputs;
    use dep::aztec3::context::PrivateFunctionExecutionContext;
    use dep::aztec3::notes::value_note::Note;
    use dep::aztec3::types::point::Point;
    use dep::aztec3::state_vars::map::Map;
    use dep::aztec3::state_vars::set::Set;

    global balances = Map { storage_slot: 1 };

    /// ABI constructor params [{"name":"value","type":{"kind":"field"},"visibility":"public"},{"name":"owner","type":{"kind":"struct","fields":[{"name":"x","type":{"kind":"field"}},{"name":"y","type":{"kind":"field"}}]},"visibility":"public"}]
    /// ABI constructor return []
    fn constructor(
        inputs: Inputs,
        result: pub [Field; abi::PUBLIC_INPUTS_LENGTH],
    ){
        let mut context = PrivateFunctionExecutionContext::new(inputs, result);

        let initial_supply = inputs.args[0];
        let owner = Point::new(inputs.args[1], inputs.args[2]);

        let owner_balance = balances.at(owner.x);
        let note = Note::new(initial_supply, owner);

        context = owner_balance.insert(context, note);
        
        context.finish();
    }


    /// ABI mint params [{"name":"value","type":{"kind":"field"},"visibility":"public"},{"name":"owner","type":{"kind":"struct","fields":[{"name":"x","type":{"kind":"field"}},{"name":"y","type":{"kind":"field"}}]},"visibility":"public"}]
    /// ABI mint return []
    fn mint(
        inputs: Inputs,
        result: pub [Field; abi::PUBLIC_INPUTS_LENGTH],
    ){
        let mut context = PrivateFunctionExecutionContext::new(inputs, result);

        let amount = inputs.args[0];
        let owner = Point::new(inputs.args[1], inputs.args[2]);

        let owner_balance = balances.at(owner.x);
        let note = Note::new(amount, owner);

        context = owner_balance.insert(context, note);
        
        context.finish();
    }

    /// ABI transfer params [{"name":"amount","type":{"kind":"field"},"visibility":"public"},{"name":"sender","type":{"kind":"struct","fields":[{"name":"x","type":{"kind":"field"}},{"name":"y","type":{"kind":"field"}}],"visibility":"public"}},{"name":"recipient","type":{"kind":"struct","fields":[{"name":"x","type":{"kind":"field"}},{"name":"y","type":{"kind":"field"}}],"visibility":"public"}}]
    /// ABI transfer return []
    fn transfer(
        inputs: Inputs,
        result: pub [Field; abi::PUBLIC_INPUTS_LENGTH],
    ){
        let mut context = PrivateFunctionExecutionContext::new(inputs, result);

        let amount = inputs.args[0];
        let sender = Point::new(inputs.args[1], inputs.args[2]);
        let recipient = Point::new(inputs.args[3], inputs.args[4]);

        let sender_balance = balances.at(sender.x);

        let get_result = sender_balance.get_2(inputs, context);
        context = get_result.0;
        let (note1, note2) = get_result.1;

        // TODO: Removing this return breaks the circuit (???)
        context.return_values = context.return_values.push(note1.is_real as Field);
        context.return_values = context.return_values.push(note2.is_real as Field);

        note1.validate(sender);
        note2.validate(sender);

        let sum = note1.value + note2.value;
        constrain sum as u64 >= amount as u64;
        let change_value = sum - amount;

        context = sender_balance.remove(inputs, context, note1);
        context = sender_balance.remove(inputs, context, note2);

        let change_note = Note::new(change_value, sender);
        let recipient_note = Note::new(amount, recipient);

        let recipient_balance = balances.at(recipient.x);

        context = recipient_balance.insert(context, recipient_note);
        context = sender_balance.insert(context, change_note);

        context.finish();
    }

}
