contract Child {
    use dep::aztec3::abi;
    use dep::aztec3::abi::Inputs;
    use dep::aztec3::context::PrivateFunctionExecutionContext;

    /// ABI constructor params []
    /// ABI constructor return []
    fn constructor(
        inputs: Inputs,
        result: pub [Field; abi::PUBLIC_INPUTS_LENGTH],
    ) {
        PrivateFunctionExecutionContext::new(inputs, result).finish();
    }

    /// ABI value params [{"name":"input","type":{"kind":"field"},"visibility":"public"}]
    /// ABI value return [{"kind":"field"}]
    fn value(
        inputs: Inputs,
        result: pub [Field; abi::PUBLIC_INPUTS_LENGTH],
    ) {
        let mut context = PrivateFunctionExecutionContext::new(inputs, result);

        context.return_values = context.return_values.push(inputs.args[0] + 42);

        context.finish();
    }
}
