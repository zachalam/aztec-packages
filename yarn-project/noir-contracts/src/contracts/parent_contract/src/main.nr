contract Parent {
    use dep::aztec3::abi;
    use dep::aztec3::abi::Inputs;
    use dep::aztec3::context::PrivateFunctionExecutionContext;
    use dep::aztec3::private_call_stack_item::PrivateCallStackItem;

    /// ABI constructor params []
    /// ABI constructor return []
    fn constructor(
        inputs: Inputs,
        result: pub [Field; abi::PUBLIC_INPUTS_LENGTH],
    ) {
        PrivateFunctionExecutionContext::new(inputs, result).finish();
    }

    /// ABI entryPoint params [{"name":"targetContract","type":{"kind":"field"},"visibility":"public"},{"name":"targetSelector","type":{"kind":"field"}}]
    /// ABI entryPoint return [{"kind":"field"}]
    fn entryPoint(
        inputs: Inputs,
        result: pub [Field; abi::PUBLIC_INPUTS_LENGTH],
    ) {
        let mut initialContext = PrivateFunctionExecutionContext::new(inputs, result);

        let targetContract = inputs.args[0];
        let targetSelector = inputs.args[1];

        let (callStackItem, mut context) = initialContext.call_private_function(targetContract, targetSelector, [0; dep::aztec3::abi::MAX_ARGS]);

        let result = callStackItem.public_inputs.return_values[0];

        context.return_values = context.return_values.push(result);

        context.finish();
    }
}
