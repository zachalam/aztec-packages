contract Test {
    use dep::aztec3::abi;
    use dep::aztec3::abi::Inputs;
    use dep::aztec3::context::PrivateFunctionExecutionContext;

    fn constructor(
        inputs: Inputs,
        result: pub [Field; abi::PUBLIC_INPUTS_LENGTH],
    ) {
        let mut context = PrivateFunctionExecutionContext::new(inputs, result);

        for i in 0..abi::MAX_ARGS {
            constrain inputs.args[i] == 0;
        }

        context.finish();
    }
}
