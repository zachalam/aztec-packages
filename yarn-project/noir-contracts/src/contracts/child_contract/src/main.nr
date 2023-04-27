contract Child {
    use dep::aztec3::abi;
    use dep::aztec3::context::PrivateFunctionContext;

    fn constructor() -> pub [Field; abi::PUBLIC_INPUTS_LENGTH] {
        PrivateFunctionContext::new().finish()
    }

    fn value(
        input: pub Field,
    ) -> pub [Field; abi::PUBLIC_INPUTS_LENGTH] {
        let mut context = PrivateFunctionContext::new();

        context = context.push_args([input]);

        context.return_values = context.return_values.push(input + 42);

        context.finish()
    }
}
