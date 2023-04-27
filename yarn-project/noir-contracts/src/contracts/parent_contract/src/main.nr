contract Parent {
    use dep::aztec3::abi;
    use dep::aztec3::context::PrivateFunctionContext;
    use dep::aztec3::private_call_stack_item::PrivateCallStackItem;

    fn constructor() -> pub [Field; abi::PUBLIC_INPUTS_LENGTH] {
        PrivateFunctionContext::new().finish()
    }

    fn entryPoint(
        targetContract: pub Field,
        targetSelector: pub Field,
    ) -> pub [Field; abi::PUBLIC_INPUTS_LENGTH] {
        let mut context = PrivateFunctionContext::new();

        context = context.push_args([targetContract, targetSelector]);

        let call_result = PrivateCallStackItem::call(targetContract, targetSelector, [0; dep::aztec3::abi::MAX_ARGS], context);

        let call_stack_item = call_result.0;
        context = call_result.1;

        let result = call_stack_item.public_inputs.return_values[0];

        context.return_values = context.return_values.push(result);

        context.finish()
    }

}