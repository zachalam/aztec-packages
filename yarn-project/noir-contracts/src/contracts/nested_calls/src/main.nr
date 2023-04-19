contract Parent {
    use dep::aztec3::abi;
    use dep::aztec3::abi::Inputs;
    use dep::aztec3::context::PrivateFunctionExecutionContext;
    use dep::aztec3::private_call_stack_item::PrivateCallStackItem;

    fn constructor(
        inputs: Inputs,
        result: pub [Field; abi::PUBLIC_INPUTS_LENGTH],
    ) {
        PrivateFunctionExecutionContext::new(inputs, result).finish();
    }

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

contract Child {
    use dep::aztec3::abi;
    use dep::aztec3::abi::Inputs;
    use dep::aztec3::context::PrivateFunctionExecutionContext;

    fn constructor(
        inputs: Inputs,
        result: pub [Field; abi::PUBLIC_INPUTS_LENGTH],
    ) {
        PrivateFunctionExecutionContext::new(inputs, result).finish();
    }

    fn value(
        inputs: Inputs,
        result: pub [Field; abi::PUBLIC_INPUTS_LENGTH],
    ) {
        let mut context = PrivateFunctionExecutionContext::new(inputs, result);

        context.return_values = context.return_values.push(inputs.args[0] + 42);

        context.finish();
    }
}
